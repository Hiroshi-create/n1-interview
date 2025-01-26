import { query, where, getDocs, deleteDoc, CollectionReference } from 'firebase/firestore';

export async function cleanOperationMessages(messageCollectionRef: CollectionReference) {
  const operationCheckQuery = query(messageCollectionRef, where("type", "==", "operation_check"));
  const operationCheckSnapshot = await getDocs(operationCheckQuery);
  const deletePromises = operationCheckSnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}
