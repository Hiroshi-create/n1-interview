"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckIcon } from "@heroicons/react/24/solid"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { SubscriptionPlans } from "@/stores/SubscriptionPlans"
import { useAppsContext } from "@/context/AppContext"
import { Client } from "@/stores/Client"
import { useRouter, useSearchParams } from "next/navigation"
import { getStripe } from "@/lib/stripe"
import { useToast } from '@/context/ToastContext'

const SelectSubscriptionPlans: React.FC = () => {
    const searchParams = useSearchParams();
    const planType = searchParams.get('') || null;
    const router = useRouter();
    const { user, userId } = useAppsContext();
    const toast = useToast();
    const [plans, setPlans] = useState<SubscriptionPlans[]>([])
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
    const [inOrganization, setInOrganization] = useState<boolean | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [newPlan, setNewPlan] = useState<{
      planType: string;
      billingCycle: string;
      startDate: string;
    }>({
      planType: '',
      billingCycle: '',
      startDate: '',
    })

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                setLoading(true);
                setError(null);
                const q = query(collection(db, "subscriptionPlans"), where("isActive", "==", true))
                const querySnapshot = await getDocs(q)
                const fetchedPlans: SubscriptionPlans[] = []
                querySnapshot.forEach((doc) => {
                    fetchedPlans.push({ subscriptionPlansId: doc.id, ...doc.data() } as SubscriptionPlans)
                });

                // プランタイプに基づいて並び替え
                const sortedPlans = fetchedPlans.sort((a, b) => {
                    const order = { basic: 1, pro: 2, enterprise: 3 }
                    return order[a.planType as keyof typeof order] - order[b.planType as keyof typeof order]
                });

                setPlans(sortedPlans);
            } catch (err) {
                console.error('プランの取得に失敗しました:', err);
                setError('プランの読み込みに失敗しました。ページを再読み込みしてください。');
            } finally {
                setLoading(false);
            }
        }
        fetchPlans();
    }, [])
  
    useEffect(() => {
        const checkUserOrganization = async () => {
            if (!userId) return;
            const userDocRef = doc(db, "users", userId);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                setInOrganization(userData.inOrganization);
                if (userData.inOrganization && userData.organizationId) {
                    const orgDocRef = doc(db, "clients", userData.organizationId);
                    const orgDocSnap = await getDoc(orgDocRef);
                    if (orgDocSnap.exists()) {
                        const clientData = orgDocSnap.data() as Client;
                        setClient(clientData);
                        setSelectedPlan(clientData.subscriptionProductId);
                    }
                }
            } else {
                setInOrganization(false);
            }
        };
        checkUserOrganization();
    }, [userId]);


    useEffect(() => {
        const ifSelectedPlan = () => {
            if (planType) {
                const matchingPlan = plans.find(plan => plan.planType === planType);
                console.log(plans)
                if (matchingPlan) {
                    openAddUserDialog(matchingPlan);
                }
            }
        }
        ifSelectedPlan();
    }, [plans, inOrganization])
  
    const getPlanColor = (planType: string) => {
      switch (planType) {
        case 'basic':
          return "from-blue-600 to-blue-400"
        case 'pro':
          return "from-purple-600 to-purple-400"
        case 'enterprise':
          return "from-indigo-600 to-indigo-400"
        default:
          return "from-gray-600 to-gray-400"
      }
    }
  
    const getBillingCycleText = (billingCycle: string) => {
      return billingCycle === 'monthly' ? '月' : '年'
    }
  
    const openAddUserDialog = async (plan: SubscriptionPlans) => {
        if (inOrganization === null) {
            // サインアップ/ログインしていない場合
            router.push(`/clients/register?=${plan.planType}`);
        } else if (selectedPlan !== plan.subscriptionProductId) {
            // プランの加入/変更
            await handleChangePlan(plan.subscriptionProductId);
        } else if (selectedPlan === plan.subscriptionProductId) {
            // プランの管理
            await handleManagementPlan();
        }
    };

    const handleChangePlan = async (subscriptionProductId: string) => {
      try {
        const response = await fetch('/api/subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            subscriptionProductId: subscriptionProductId,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const stripe = await getStripe();
          if (stripe) {
            await stripe.redirectToCheckout({ sessionId: data.id });
          } else {
            console.error('Stripe failed to initialize. Check your publishable key.');
            toast.error('決済サービスの初期化に失敗しました', '設定を確認してください。');
          }
        } else {
          throw new Error('サブスクリプションの更新に失敗しました');
        }
      } catch (error) {
        console.error('エラー:', error);
        toast.error('サブスクリプションの更新中にエラーが発生しました');
      }
    };
    
    const handleManagementPlan = async () => {
        try {
            const response = await fetch('/api/stripe_portal', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                }),
            });
            if (response.ok) {
                const data = await response.json();
                router.push(data.url);
            } else {
                throw new Error('サブスクリプションの更新に失敗しました');
            }
        } catch (error) {
            console.error('エラー:', error);
            toast.error('サブスクリプションの更新中にエラーが発生しました');
        }
    }
    
    // ローディング中の表示
    if (loading) {
        return (
            <div className="flex justify-center items-center py-24">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
                    <p className="text-lg text-muted-foreground">料金プランを読み込み中...</p>
                </div>
            </div>
        );
    }

    // エラー時の表示
    if (error) {
        return (
            <div className="flex justify-center items-center py-24">
                <div className="text-center space-y-4 max-w-md">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h3 className="text-xl font-semibold text-red-600">エラーが発生しました</h3>
                    <p className="text-muted-foreground">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        ページを再読み込み
                    </button>
                </div>
            </div>
        );
    }

    // プランが0件の場合の表示
    if (plans.length === 0) {
        return (
            <div className="flex justify-center items-center py-24">
                <div className="text-center space-y-4 max-w-md">
                    <div className="text-gray-400 text-5xl mb-4">📋</div>
                    <h3 className="text-xl font-semibold">現在利用可能なプランがありません</h3>
                    <p className="text-muted-foreground">
                        しばらくしてから再度お試しください。<br />
                        問題が解決しない場合は、サポートにお問い合わせください。
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 auto-rows-fr">
            {plans.map((plan) => (
                <PlanCard
                    key={plan.subscriptionPlansId}
                    plan={plan}
                    selectedPlan={selectedPlan}
                    openAddUserDialog={openAddUserDialog}
                />
            ))}
        </div>
    );
  
    function PlanCard({
      plan,
      selectedPlan,
      openAddUserDialog,
    } : {
      plan: SubscriptionPlans,
      selectedPlan: string | null,
      openAddUserDialog: (plan: SubscriptionPlans) => Promise<void>,
    }) {
      return (
        <motion.div
          className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          whileHover={{ y: -5 }}
        >
          <PlanHeader plan={plan} />
          <PlanContent plan={plan} />
          <PlanFooter
            plan={plan}
            selectedPlan={selectedPlan}
            openAddUserDialog={openAddUserDialog}
          />
        </motion.div>
      );
    }
    
    function PlanHeader({ plan } : { plan: SubscriptionPlans }) {
      return (
        <div className={`px-8 py-8 bg-gradient-to-br ${getPlanColor(plan.planType)}`}>
          <h3 className="text-3xl font-bold text-white mb-2">{plan.planName}</h3>
          <p className="text-white text-opacity-80 text-sm mb-4">{plan.description}</p>
          <p className="text-3xl font-bold text-white mb-2">
            ¥ {plan.price.toLocaleString()}
            <span className="text-xl font-normal"> / {getBillingCycleText(plan.billingCycle)}</span>
          </p>
        </div>
      );
    }
    
    function PlanContent({ plan } : { plan: SubscriptionPlans }) {
      return (
        <div className="px-4 py-6 flex-grow">
          <ul className="space-y-2 mb-4">
            {plan.features.map((feature, index) => (
              <FeatureItem key={index} feature={feature} />
            ))}
            <FeatureItem feature={`${plan.usageQuota.userNum ? `${plan.usageQuota.userNum}ユーザーまで` : '無制限ユーザー'}`} />
            <FeatureItem feature={`${plan.usageQuota.storage}GBストレージ`} />
          </ul>
        </div>
      );
    }
    
    function FeatureItem({ feature } : { feature: string }) {
      return (
        <li className="flex items-center">
          <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
          <span className="text-gray-700">{feature}</span>
        </li>
      );
    }
    
    function PlanFooter({
      plan,
      selectedPlan,
      openAddUserDialog,
    } : {
      plan: SubscriptionPlans,
      selectedPlan: string | null,
      openAddUserDialog: (plan: SubscriptionPlans) => Promise<void>,
    }) {
      return (
        <div className="px-4 pb-6">
          <motion.button
            onClick={() => openAddUserDialog(plan)}
            className={`w-full px-4 py-2 rounded-lg text-base font-semibold text-white transition-colors duration-300 ${
              selectedPlan === plan.subscriptionProductId
                ? `bg-gradient-to-r ${getPlanColor(plan.planType)}`
                : "bg-orange-400 hover:bg-orange-500"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {inOrganization === null ? "まずはサインアップ！" : selectedPlan === null ? "プランを選択" : selectedPlan === plan.subscriptionProductId ? "プランを管理" : "プランを変更"}
          </motion.button>
        </div>
      );
    }
}

export default SelectSubscriptionPlans;