// SampleDataGenerator.js - Utility to generate sample Excel spreadsheets for immediate testing
import * as XLSX from 'xlsx';

export class SampleDataGenerator {
  static generateEnsReport() {
    const data = [
      {
        "Patient ID": "MRN-849",
        "First Name": "Jonathan",
        "Last Name": "Miller",
        "DOB": "1980-04-12",
        "Sex": "M",
        "Event Type": "Discharge",
        "Encounter Class": "Inpatient",
        "Discharge Date": new Date().toISOString().slice(0, 10),
        "Practice Name": "Valley Health Center",
        "Cell Phone": "5551234567",
        "Home Phone": "5559876543",
        "Work Phone": ""
      },
      {
        "Patient ID": "MRN-391",
        "First Name": "Sarah",
        "Last Name": "Connor",
        "DOB": "1965-11-10",
        "Sex": "F",
        "Event Type": "Discharge",
        "Encounter Class": "Inpatient",
        "Discharge Date": new Date().toISOString().slice(0, 10),
        "Practice Name": "Apex Medical Group",
        "Cell Phone": "",
        "Home Phone": "5558000143",
        "Work Phone": ""
      },
      {
        "Patient ID": "MRN-773",
        "First Name": "Thomas",
        "Last Name": "Anderson",
        "DOB": "1971-09-13",
        "Sex": "M",
        "Event Type": "Admission", // Exclude (Not a discharge)
        "Encounter Class": "Inpatient",
        "Discharge Date": "",
        "Practice Name": "Valley Health Center",
        "Cell Phone": "5553034920",
        "Home Phone": "",
        "Work Phone": ""
      },
      {
        "Patient ID": "MRN-204",
        "First Name": "Eleanor",
        "Last Name": "Vance",
        "DOB": "1994-06-25",
        "Sex": "Female",
        "Event Type": "Discharge",
        "Encounter Class": "Outpatient", // Exclude (Outpatient)
        "Discharge Date": new Date().toISOString().slice(0, 10),
        "Practice Name": "Valley Health Center",
        "Cell Phone": "5554445555",
        "Home Phone": "",
        "Work Phone": ""
      },
      {
        "Patient ID": "MRN-902",
        "First Name": "Robert",
        "Last Name": "Neville",
        "DOB": "1975-01-08",
        "Sex": "M",
        "Event Type": "Discharge",
        "Encounter Class": "Inpatient",
        "Discharge Date": new Date().toISOString().slice(0, 10),
        "Practice Name": "Summit Family Clinic", // Matches but inactive practice
        "Cell Phone": "5557778888",
        "Home Phone": "",
        "Work Phone": ""
      },
      {
        "Patient ID": "MRN-551",
        "First Name": "Clara",
        "Last Name": "Oswald",
        "DOB": "1989-12-05",
        "Sex": "F",
        "Event Type": "Discharge",
        "Encounter Class": "Inpatient",
        "Discharge Date": new Date().toISOString().slice(0, 10),
        "Practice Name": "Unknown Health Systems", // Unmatched practice
        "Cell Phone": "5559990000",
        "Home Phone": "",
        "Work Phone": ""
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ENS_Report");
    return workbook;
  }

  static generateAiAccountsList() {
    const data = [
      { "Account Name": "Valley Health Center", "Status": "Active" },
      { "Account Name": "Apex Medical Group", "Status": "Active" },
      { "Account Name": "Summit Family Clinic", "Status": "Inactive" }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AI_Accounts");
    return workbook;
  }

  static downloadWorkbook(workbook, filename) {
    XLSX.writeFile(workbook, filename);
  }
}

export default SampleDataGenerator;
