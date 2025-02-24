import { adminDb } from "@/lib/firebase-admin";

export async function cleanOperationMessages(collectionPath: string) {
  const messageCollectionRef = adminDb.collection(collectionPath);
  const operationCheckQuery = messageCollectionRef.where("type", "==", "operation_check");
  const operationCheckSnapshot = await operationCheckQuery.get();
  
  const batch = adminDb.batch();
  operationCheckSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
}
