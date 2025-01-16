const functions = require('firebase-functions/v1');
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

admin.initializeApp();

exports.updateCollectInterviewsCount = functions.firestore
  .document('themes/{themeId}/interviews/{interviewId}')
  .onWrite(async (change, context) => {
    const themeId = context.params.themeId;
    // const newValue = change.after.data();
    // const oldValue = change.before.data();

    // individualReportサブコレクションが作成されたか、reportCreatedがtrueになった場合
    if (
    //   (newValue && newValue.reportCreated && !oldValue?.reportCreated) ||
      (change.after.ref.collection('individualReport').id !== change.before.ref.collection('individualReport').id)
    ) {
      const themeRef = admin.firestore().collection('themes').doc(themeId);
      
      try {
        await admin.firestore().runTransaction(async (transaction) => {
          const themeDoc = await transaction.get(themeRef);
          const currentCount = themeDoc.data().collectInterviewsCount || 0;
          
          transaction.update(themeRef, {
            collectInterviewsCount: currentCount + 1
          });
        });
        logger.info(`Successfully updated collectInterviewsCount for theme ${themeId}`);
      } catch (error) {
        logger.error(`Error updating collectInterviewsCount for theme ${themeId}:`, error);
      }
    }
    
    return null;
  });
