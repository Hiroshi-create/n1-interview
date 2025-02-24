import { adminDb } from '../../../lib/firebase-admin';

export async function serverGetTenantIdForDomain(domain: string): Promise<string | null> {
    const tenantsRef = adminDb.collection('tenants');
    const snapshot = await tenantsRef.where('domain', '==', domain).limit(1).get();
    
    if (!snapshot.empty) {
        return snapshot.docs[0].data().tenantId;
    }
    return null;
}
