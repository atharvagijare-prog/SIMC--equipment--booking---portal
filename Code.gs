/**
 * SIMC Equipment Management System - Backend Script
 * Target Sheet: Issue-Return_Equipment_Final
 */

const SPREADSHEET_NAME = "Issue-Return_Equipment_Final";
const TAB_INVENTORY = "Eq_Data_Base";
const TAB_STUDENTS = "Students Full DataBase";
const TAB_REQUESTS = "Requests";
const VERCEL_URL = "YOUR_VERCEL_URL"; // Replace after Vercel deployment

/**
 * Initialize the spreadsheet: Create the Requests tab if it doesn't exist.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let requestSheet = ss.getSheetByName(TAB_REQUESTS);
  
  if (!requestSheet) {
    requestSheet = ss.insertSheet(TAB_REQUESTS);
    const headers = [
      "RequestID", "StudentName", "StudentPRN", "StudentEmail", 
      "EquipmentSIMNo", "EquipmentDescription", "Quantity", 
      "Purpose", "FromDate", "ReturnDate", "SubmittedOn", 
      "HODStatus", "ManagerStatus"
    ];
    requestSheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    requestSheet.setFrozenRows(1);
  }
}

/**
 * GET Request Handler
 */
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === "getInventory") {
    return jsonResponse(getInventoryData());
  }
  
  if (action === "validateStudent") {
    const prn = e.parameter.prn;
    return jsonResponse(validateStudentPRN(prn));
  }
  
  if (action === "getRequests") {
    const role = e.parameter.role;
    const email = e.parameter.email;
    const prn = e.parameter.prn;
    return jsonResponse(getRequestsData(role, email, prn));
  }
  
  return jsonResponse({ error: "Invalid action" });
}

/**
 * POST Request Handler
 */
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  if (action === "submitRequest") {
    return jsonResponse(submitNewRequest(data));
  }
  
  if (action === "updateHODStatus") {
    return jsonResponse(updateHODStatus(data.requestId, data.status));
  }
  
  if (action === "updateManagerStatus") {
    return jsonResponse(updateManagerStatus(data.requestId, data.status));
  }

  if (action === "addEquipment") {
    return jsonResponse(addEquipment(data));
  }
  
  return jsonResponse({ error: "Invalid action" });
}

/**
 * Helper: JSON Response
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Data: Get Inventory from Eq_Data_Base
 */
function getInventoryData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_INVENTORY);
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);
  
  // Mapping based on user provided structure:
  // A=Sr. No., B=SIM No, C=Type, D=Description, E=Qty, F=Serial, G=Location
  return rows.map(row => ({
    SIMNo: row[1],
    Category: row[2],
    Description: row[3],
    Qty: row[4],
    SerialNo: row[5],
    Location: row[6]
  })).filter(item => item.SIMNo);
}

/**
 * Data: Add New Equipment
 */
function addEquipment(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_INVENTORY);
  const lastRow = sheet.getLastRow();
  const srNo = lastRow; // Simple increment
  
  // A=Sr. No., B=SIM No, C=Type, D=Description, E=Qty, F=Serial, G=Location
  sheet.appendRow([
    srNo,
    "SIM-" + Math.random().toString(36).substr(2, 6).toUpperCase(), // Generate a SIM No if not provided
    data.category,
    data.name, // Using 'name' from frontend as Description
    data.total,
    "", // Serial No empty for new
    "SIMC Store" // Default location
  ]);
  
  return { success: true };
}

/**
 * Data: Validate Student by PRN
 */
function validateStudentPRN(prn) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_STUDENTS);
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);
  
  const student = rows.find(row => String(row[0]).trim() === String(prn).trim());
  
  if (student) {
    return {
      success: true,
      prn: student[0],
      name: student[1],
      specialization: student[2],
      semester: student[3]
    };
  }
  return { success: false, error: "PRN not found in database" };
}

/**
 * Data: Submit Request
 */
function submitNewRequest(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_REQUESTS);
  const requestId = "REQ-" + Math.random().toString(36).substr(2, 9).toUpperCase();
  const submittedOn = new Date();
  
  // Columns: A=RequestID, B=StudentName, C=StudentPRN, D=StudentEmail, E=EquipmentSIMNo, 
  // F=EquipmentDescription, G=Quantity, H=Purpose, I=FromDate, J=ReturnDate, K=SubmittedOn, L=HODStatus, M=ManagerStatus
  sheet.appendRow([
    requestId,
    data.studentName,
    data.studentPRN,
    data.studentEmail,
    data.equipmentSIMNo,
    data.equipmentDescription,
    data.quantity,
    data.purpose,
    data.fromDate,
    data.returnDate,
    submittedOn,
    "Pending",
    "Pending"
  ]);
  
  // Send HOD Approval Email
  sendHODEmail(
    requestId, 
    data.studentName, 
    data.studentPRN, 
    data.equipmentDescription, 
    data.quantity, 
    data.purpose, 
    data.fromDate, 
    data.returnDate
  );
  
  return { success: true, requestId: requestId };
}

/**
 * Data: Get Requests based on role
 */
function getRequestsData(role, email, prn) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_REQUESTS);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  let filtered = rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      // Clean header names to match frontend expectations if needed, 
      // but here we use them as is.
      obj[h.trim()] = row[i];
    });
    return obj;
  });
  
  if (role === "student") {
    filtered = filtered.filter(r => String(r.StudentPRN) === String(prn));
  } else if (role === "hod") {
    filtered = filtered.filter(r => r.HODStatus === "Pending");
  } else if (role === "manager") {
    filtered = filtered.filter(r => r.HODStatus === "Approved" && r.ManagerStatus !== "Returned");
  }
  
  return filtered;
}

/**
 * Data: Update HOD Status
 */
function updateHODStatus(requestId, status) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_REQUESTS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === requestId) {
      sheet.getRange(i + 1, 12).setValue(status); // Column L
      
      const studentName = data[i][1];
      const studentEmail = data[i][3];
      const equipmentDescription = data[i][5];

      if (status === "Approved") {
        // Email Student
        MailApp.sendEmail({
          to: studentEmail,
          subject: "Your Equipment Request has been Approved",
          body: `Dear ${studentName}, your request for ${equipmentDescription} has been approved by the HOD. Please collect your equipment from the manager.`
        });

        // Email Manager
        MailApp.sendEmail({
          to: "atharva.gijare@simc.edu.in",
          subject: `Action Required — Issue Equipment to ${studentName}`,
          body: `HOD has approved ${studentName}'s request for ${equipmentDescription}. Please issue the equipment.`
        });
      } else if (status === "Rejected") {
        // Email Student
        MailApp.sendEmail({
          to: studentEmail,
          subject: "Your Equipment Request has been Rejected",
          body: `Dear ${studentName}, your request for ${equipmentDescription} has been rejected by the HOD.`
        });
      }

      return { success: true };
    }
  }
  return { success: false, error: "Request not found" };
}

/**
 * Data: Update Manager Status (and Inventory)
 */
function updateManagerStatus(requestId, status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reqSheet = ss.getSheetByName(TAB_REQUESTS);
  const invSheet = ss.getSheetByName(TAB_INVENTORY);
  
  const reqData = reqSheet.getDataRange().getValues();
  let simNo = "";
  let qtyToAdjust = 0;
  let studentName = "";
  let studentEmail = "";
  let equipmentDescription = "";
  
  // Find Request
  for (let i = 1; i < reqData.length; i++) {
    if (reqData[i][0] === requestId) {
      studentName = reqData[i][1];
      studentEmail = reqData[i][3];
      simNo = reqData[i][4]; // Column E: EquipmentSIMNo
      equipmentDescription = reqData[i][5];
      qtyToAdjust = parseInt(reqData[i][6]); // Column G: Quantity
      reqSheet.getRange(i + 1, 13).setValue(status); // Column M

      if (status === "Issued") {
        // Email Student
        MailApp.sendEmail({
          to: studentEmail,
          subject: "Your Equipment is Ready for Pickup",
          body: `Dear ${studentName}, your equipment ${equipmentDescription} is ready. Please collect it from the equipment room.`
        });
      }
      break;
    }
  }
  
  if (!simNo) return { success: false, error: "Request not found" };
  
  // Adjust Inventory
  const invData = invSheet.getDataRange().getValues();
  for (let j = 1; j < invData.length; j++) {
    if (String(invData[j][1]) === String(simNo)) { // Column B: SIM No
      let currentQty = parseInt(invData[j][4]); // Column E: Qty
      let newQty = currentQty;
      
      if (status === "Issued") {
        newQty = currentQty - qtyToAdjust;
      } else if (status === "Returned") {
        newQty = currentQty + qtyToAdjust;
      }
      
      invSheet.getRange(j + 1, 5).setValue(newQty); // Update Column E
      return { success: true };
    }
  }
  
  return { success: true, warning: "Status updated but inventory SIM No not found" };
}

/**
 * Data: Send HOD Approval Email
 */
function sendHODEmail(requestId, studentName, studentPRN, equipmentDescription, quantity, purpose, fromDate, returnDate) {
  const recipient = "atharvagijare111@gmail.com";
  const subject = `Equipment Request Approval — ${studentName}`;
  
  const approveUrl = `${VERCEL_URL}/hod.html?id=${requestId}&action=approve`;
  const rejectUrl = `${VERCEL_URL}/hod.html?id=${requestId}&action=reject`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
      <h2 style="color: #333;">New Equipment Request</h2>
      <p>A new equipment request has been submitted and requires your approval.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Student Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${studentName}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>PRN:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${studentPRN}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Equipment:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${equipmentDescription}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Quantity:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${quantity}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Purpose:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${purpose}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>From Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${fromDate}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Return Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${returnDate}</td></tr>
      </table>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${approveUrl}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin-right: 10px; font-weight: bold;">Approve Request</a>
        <a href="${rejectUrl}" style="background-color: #f44336; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reject Request</a>
      </div>
      
      <p style="font-size: 12px; color: #777; margin-top: 30px; text-align: center;">
        This is an automated message from the SIMC Equipment Management System.
      </p>
    </div>
  `;
  
  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: htmlBody
  });
}
