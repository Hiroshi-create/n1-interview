"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckIcon } from "@heroicons/react/24/solid"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { SubscriptionPlans } from "@/stores/SubscriptionPlans"
import SubscriptionPlanChangeDialog from "./components/subscriptionPlanChangeDialog"

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlans[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
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
      const q = query(collection(db, "subscriptionPlans"), where("isActive", "==", true))
      const querySnapshot = await getDocs(q)
      const fetchedPlans: SubscriptionPlans[] = []
      querySnapshot.forEach((doc) => {
        fetchedPlans.push({ subscriptionPlansId: doc.id, ...doc.data() } as SubscriptionPlans)
      })
      
      // プランタイプに基づいて並び替え
      const sortedPlans = fetchedPlans.sort((a, b) => {
        const order = { basic: 1, pro: 2, enterprise: 3 }
        return order[a.planType as keyof typeof order] - order[b.planType as keyof typeof order]
      })
      
      setPlans(sortedPlans)
    }

    fetchPlans()
  }, [])

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

  const openAddUserDialog = (subscriptionPlansId: string) => {
    if (selectedPlan !== subscriptionPlansId) {
      setSelectedPlan(subscriptionPlansId);
      setIsDialogOpen(true);
    }
  };

  const closeAddUserDialog = () => {
    setIsDialogOpen(false);
    setNewPlan({
        planType: '',
        billingCycle: '',
        startDate: '',
    });
  }

  const handleChangePlan = async () => {
    
  };

  return (
    <div className={`bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 mb-24 sm:px-6 lg:px-8 ${isDialogOpen ? 'blur-sm' : ''}`}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-4">
          最適なプランをお選びください
        </h1>
        <p className="text-xl text-gray-600 text-center mb-8">
          あなたのニーズに合わせたプランで、サービスの可能性を最大限に引き出しましょう
        </p>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <motion.div
              key={plan.subscriptionPlansId}
              className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -5 }}
            >
              <div className={`px-6 py-8 bg-gradient-to-br ${getPlanColor(plan.planType)}`}>
                <h3 className="text-2xl font-bold text-white mb-2">{plan.planName}</h3>
                <p className="text-white text-opacity-80 mb-4">{plan.description}</p>
                <p className="text-4xl font-bold text-white mb-2">
                  ¥{plan.price.toLocaleString()}<span className="text-xl font-normal"> / {getBillingCycleText(plan.billingCycle)}</span>
                </p>
              </div>
              <div className="px-6 py-8 flex flex-col flex-grow">
                <div className="flex-grow">
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                    <li className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">
                        {plan.usageQuota.userNum ? `${plan.usageQuota.userNum}ユーザーまで` : '無制限ユーザー'}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{plan.usageQuota.storage}GBストレージ</span>
                    </li>
                  </ul>
                </div>
                <motion.button
                    onClick={() => openAddUserDialog(plan.subscriptionPlansId)}
                    className={`w-full px-6 py-3 rounded-lg text-lg font-semibold text-white transition-colors duration-300 ${
                        selectedPlan === plan.subscriptionPlansId
                        ? `bg-gradient-to-r ${getPlanColor(plan.planType)}`
                        : "bg-gray-600 hover:bg-gray-700"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {selectedPlan === plan.subscriptionPlansId ? "選択中" : "プランを選択"}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {isDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <SubscriptionPlanChangeDialog
              isOpen={isDialogOpen}
              onClose={closeAddUserDialog}
              newPlan={newPlan}
              setNewPlan={setNewPlan}
              handleChangePlan={handleChangePlan}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
