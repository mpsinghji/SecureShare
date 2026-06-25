import { query } from './db.js';

const cleanDummyData = async () => {
  try {
    console.log("Cleaning up dummy data...");
    
    // Delete the dummy documents by name. The ON DELETE CASCADE on activities will clean up the related dummy activities.
    const result = await query(`
      DELETE FROM documents 
      WHERE name IN (
        'Q3 Financial Audit.pdf', 
        'Project_Ares_Manifesto.docx', 
        'Merger_Agreement_Draft_v2.pdf'
      )
    `);

    console.log(`Deleted ${result.rowCount} dummy document(s) and their associated activities.`);
    process.exit(0);
  } catch (error) {
    console.error("Error cleaning dummy data:", error);
    process.exit(1);
  }
};

cleanDummyData();
