import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function getTenantIdForDomain(domain: string): Promise<string | null> {
    const tenantsRef = collection(db, 'tenants');
    const q = query(tenantsRef, where('domain', '==', domain));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data().tenantId;
    }
    return null;
}