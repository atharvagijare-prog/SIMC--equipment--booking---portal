const VERCEL_URL = 'https://simc-equipment-booking-portal.vercel.app';

/**
 * ACTUAL COLUMN STRUCTURE (Requests Sheet):
 * A (0) = RequestID
 * B (1) = StudentName
 * C (2) = StudentPRN
 * D (3) = StudentEmail
 * E (4) = EquipmentSIMNo
 * F (5) = EquipmentDescription
 * G (6) = Quantity
 * H (7) = Purpose
 * I (8) = FromDate
 * J (9) = ReturnDate
 * K (10) = SubmittedOn
 * L (11) = HODStatus
 * M (12) = ManagerStatus
 */


/**
 * Helper to read Requests sheet with merged cell fill-down logic
 */
function getRequestsData(ss) {
  const sheet = ss.getSheetByName('Requests');
  if (!sheet) return { headers: [], rows: [] };
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { headers: data[0] || [], rows: [] };
  
  const headers = data[0];
  const processedRows = [];
  let lastRowData = null;
  
  for (let i = 1; i < data.length; i++) {
    let row = [...data[i]];
    if (!row[0]) { // If RequestID is empty (merged cell)
      if (lastRowData) {
        // Copy values for A, B, C, D, H, I, J, L, M
        [0, 1, 2, 3, 7, 8, 9, 11, 12].forEach(idx => {
          row[idx] = lastRowData[idx];
        });
      }
    } else {
      lastRowData = [...row];
    }
    processedRows.push(row);
  }
  return { headers, rows: processedRows };
}

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getInventory') {
    return jsonResponse(getInventoryData(ss));
  }
  
  if (action === 'validateStudent') {
    const prn = e.parameter.prn;
    const sheet = ss.getSheetByName('Students Full DataBase');
    if (!sheet) return jsonResponse({ success: false, error: 'Student database not found' });
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === prn) {
        return jsonResponse({
          success: true,
          name: data[i][1],
          specialization: data[i][2],
          semester: data[i][3]
        });
      }
    }
    return jsonResponse({ success: false });
  }
  
  if (action === 'getRequests') {
    const role = e.parameter.role;
    const prn = e.parameter.prn;
    const reqInfo = getRequestsData(ss);
    const headers = reqInfo.headers;
    const rows = reqInfo.rows;
    let requests = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const req = {};
      headers.forEach((h, idx) => req[h] = row[idx]);
      
      if (role === 'student' && req.StudentPRN && req.StudentPRN.toString() === prn) {
        requests.push(req);
      } else if (role === 'hod' && req.HODStatus === 'Pending') {
        requests.push(req);
      } else if (role === 'manager' && req.HODStatus === 'Approved' && req.ManagerStatus !== 'Returned') {
        requests.push(req);
      } else if (role === 'admin') {
        requests.push(req);
      }
    }
    return jsonResponse(requests);
  }
  
  if (action === 'getRequestById') {
    const id = e.parameter.id;
    const reqInfo = getRequestsData(ss);
    const headers = reqInfo.headers;
    const rows = reqInfo.rows;
    let results = [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === id) {
        const req = {};
        headers.forEach((h, idx) => req[h] = rows[i][idx]);
        results.push(req);
      }
    }
    return jsonResponse(results);
  }

  if (action === 'getAdminData') {
    const settings = { HOD_EMAIL: 'atharvagijare111@gmail.com', MANAGER_EMAIL: 'atharva.gijare@simc.edu.in' };
    const studentSheet = ss.getSheetByName('Students Full DataBase');
    const students = [];
    if (studentSheet) {
      const studentData = studentSheet.getDataRange().getValues();
      for (let i = 1; i < studentData.length; i++) {
        students.push({
          prn: studentData[i][0],
          name: studentData[i][1],
          specialization: studentData[i][2],
          semester: studentData[i][3]
        });
      }
    }

    return jsonResponse({
      settings: settings,
      students: students
    });
  }
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  if (action === 'submitRequest') {
    return submitRequest(ss, data);
  }
  
  if (action === 'updateHODStatus') {
    return updateHODStatus(ss, data);
  }
  
  if (action === 'updateSIMNumbers') {
    return updateSIMNumbers(ss, data);
  }
  
  if (action === 'updateManagerStatus') {
    return updateManagerStatus(ss, data);
  }
  
  if (action === 'addEquipment') {
    return addEquipment(ss, data);
  }


  if (action === 'deleteRequest') {
    const sheet = ss.getSheetByName('Requests');
    if (sheet) {
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      for (let i = values.length - 1; i >= 1; i--) {
        if (values[i][0] === data.requestId) {
          sheet.deleteRow(i + 1);
        }
      }
    }
    return jsonResponse({ success: true });
  }
}

function getInventoryData(ss) {
  const eqSheet = ss.getSheetByName('Eq_Data_Base');
  if (!eqSheet) return [];
  const eqData = eqSheet.getDataRange().getValues();
  
  // Count issued items by EquipmentDescription (Column F in Requests)
  const issuedCounts = {};
  const reqInfo = getRequestsData(ss);
  if (reqInfo.rows) {
    const rows = reqInfo.rows;
    const descIdx = 5; // Column F
    const qtyIdx = 6;  // Column G
    const statusIdx = 12; // Column M
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][statusIdx] === 'Issued') {
        const desc = rows[i][descIdx];
        const qty = parseInt(rows[i][qtyIdx]) || 1;
        issuedCounts[desc] = (issuedCounts[desc] || 0) + qty;
      }
    }
  }
  
  // Group by description
  const inventory = {};
  for (let i = 1; i < eqData.length; i++) {
    const type = eqData[i][2];
    const desc = eqData[i][3];
    const totalQty = parseInt(eqData[i][4]) || 0;
    
    if (!inventory[desc]) {
      inventory[desc] = {
        Type: type,
        Description: desc,
        TotalQty: 0,
        IssuedQty: issuedCounts[desc] || 0,
        AvailableQty: 0
      };
    }
    inventory[desc].TotalQty += totalQty;
  }
  
  return Object.values(inventory).map(item => {
    item.AvailableQty = item.TotalQty - item.IssuedQty;
    return item;
  });
}

function submitRequest(ss, data) {
  let sheet = ss.getSheetByName('Requests');
  if (!sheet) {
    sheet = ss.insertSheet('Requests');
    sheet.appendRow([
      'RequestID', 'StudentName', 'StudentPRN', 'StudentEmail', 'EquipmentSIMNo', 
      'EquipmentDescription', 'Quantity', 'Purpose', 'FromDate', 'ReturnDate', 
      'SubmittedOn', 'HODStatus', 'ManagerStatus'
    ]);
  }
  
  const requestId = 'REQ-' + new Date().getTime();
  const requestDate = new Date();
  const startRow = sheet.getLastRow() + 1;
  const numItems = data.items.length;
  
  data.items.forEach(item => {
    sheet.appendRow([
      requestId, data.studentName, data.studentPRN, data.studentEmail, 
      '', // EquipmentSIMNo (E)
      item.description, // EquipmentDescription (F)
      item.qty || 1, // Quantity (G)
      data.purpose, // Purpose (H)
      data.fromDate, // FromDate (I)
      data.returnDate, // ReturnDate (J)
      requestDate, // SubmittedOn (K)
      'Pending', // HODStatus (L)
      'Pending' // ManagerStatus (M)
    ]);
  });
  
  // Merge common cells: A, B, C, D, H, I, J, L, M
  // Column indices: A=1, B=2, C=3, D=4, H=8, I=9, J=10, L=12, M=13
  const mergeCols = [1, 2, 3, 4, 8, 9, 10, 12, 13];
  if (numItems > 1) {
    mergeCols.forEach(col => {
      sheet.getRange(startRow, col, numItems, 1).merge();
    });
  }
  
  // Send Email to HOD
  const approveUrl = `${VERCEL_URL}/hod.html?id=${requestId}&action=approve`;
  const rejectUrl = `${VERCEL_URL}/hod.html?id=${requestId}&action=reject`;
  
  const emailBody = `
    <h3>New Equipment Request: ${requestId}</h3>
    <p><b>Student:</b> ${data.studentName} (${data.studentPRN})</p>
    <p><b>Purpose:</b> ${data.purpose}</p>
    <p><b>Duration:</b> ${data.fromDate} to ${data.returnDate}</p>
    <p><b>Equipment:</b></p>
    <ul>
      ${data.items.map(i => `<li>${i.description} (Qty: ${i.qty || 1})</li>`).join('')}
    </ul>
    <p>
      <a href="${approveUrl}" style="background: green; color: white; padding: 10px; text-decoration: none;">Approve</a>
      &nbsp;
      <a href="${rejectUrl}" style="background: red; color: white; padding: 10px; text-decoration: none;">Reject</a>
    </p>
  `;
  
  MailApp.sendEmail({
    to: 'atharvagijare111@gmail.com',
    subject: `New Equipment Request - ${data.studentName}`,
    htmlBody: emailBody
  });
  
  return jsonResponse({ success: true, requestId: requestId });
}

function updateHODStatus(ss, data) {
  const sheet = ss.getSheetByName('Requests');
  const rows = sheet.getDataRange().getValues();
  let studentEmail = '';
  let studentName = '';
  let equipmentList = [];
  
  let lastRequestID = '';
  for (let i = 1; i < rows.length; i++) {
    const currentID = rows[i][0] || lastRequestID;
    if (currentID === data.requestId) {
      sheet.getRange(i + 1, 12).setValue(data.status); // Column L
      if (rows[i][0]) { // Only first row of group has student info
        studentEmail = rows[i][3];
        studentName = rows[i][1];
      }
      equipmentList.push(rows[i][5]); // EquipmentDescription (F)
    }
    if (rows[i][0]) lastRequestID = rows[i][0];
  }
  
  if (data.status === 'Approved') {
    if (studentEmail) {
      MailApp.sendEmail({
        to: studentEmail,
        subject: 'Equipment Request Approved',
        body: `Your request ${data.requestId} has been approved by the HOD. Please collect the equipment from the manager.`
      });
    }
    MailApp.sendEmail({
      to: 'atharva.gijare@simc.edu.in',
      subject: `Issue Equipment - ${studentName}`,
      body: `HOD has approved the request ${data.requestId} for ${studentName}. Please issue the following equipment: \n\n ${equipmentList.join('\n')}`
    });
  } else {
    if (studentEmail) {
      MailApp.sendEmail({
        to: studentEmail,
        subject: 'Equipment Request Rejected',
        body: `Your request ${data.requestId} has been rejected by the HOD. \nReason: ${data.reason || 'Not specified'}`
      });
    }
  }
  
  return jsonResponse({ success: true });
}

function updateSIMNumbers(ss, data) {
  const sheet = ss.getSheetByName('Requests');
  const rows = sheet.getDataRange().getValues();
  
  data.updates.forEach(update => {
    let lastRequestID = '';
    for (let i = 1; i < rows.length; i++) {
      const currentID = rows[i][0] || lastRequestID;
      if (currentID === data.requestId && rows[i][5] === update.description) {
        sheet.getRange(i + 1, 5).setValue(update.simNo); // Column E
        break;
      }
      if (rows[i][0]) lastRequestID = rows[i][0];
    }
  });
  
  return jsonResponse({ success: true });
}

function updateManagerStatus(ss, data) {
  const reqSheet = ss.getSheetByName('Requests');
  const reqRows = reqSheet.getDataRange().getValues();
  const eqSheet = ss.getSheetByName('Eq_Data_Base');
  if (!eqSheet) return jsonResponse({ success: false, error: 'Inventory sheet not found' });
  const eqData = eqSheet.getDataRange().getValues();
  
  let studentEmail = '';
  let equipmentDescsToUpdate = [];
  
  let lastRequestID = '';
  for (let i = 1; i < reqRows.length; i++) {
    const currentID = reqRows[i][0] || lastRequestID;
    if (currentID === data.requestId) {
      reqSheet.getRange(i + 1, 13).setValue(data.status); // Column M
      if (reqRows[i][0]) studentEmail = reqRows[i][3];
      equipmentDescsToUpdate.push({
        desc: reqRows[i][5], // Column F
        qty: parseInt(reqRows[i][6]) || 1 // Column G
      });
    }
    if (reqRows[i][0]) lastRequestID = reqRows[i][0];
  }
  
  // Update Inventory Qty in Eq_Data_Base
  const adjustment = (data.status === 'Issued') ? -1 : (data.status === 'Returned' ? 1 : 0);
  
  if (adjustment !== 0) {
    equipmentDescsToUpdate.forEach(item => {
      for (let j = 1; j < eqData.length; j++) {
        if (eqData[j][3] === item.desc) { // Column D is Description (index 3)
          const currentQty = parseInt(eqData[j][4]) || 0; // Column E is Qty (index 4)
          eqSheet.getRange(j + 1, 5).setValue(currentQty + (adjustment * item.qty));
          break;
        }
      }
    });
  }
  
  if (data.status === 'Issued' && studentEmail) {
    MailApp.sendEmail({
      to: studentEmail,
      subject: 'Equipment Issued',
      body: `The equipment for your request ${data.requestId} has been marked as Issued.`
    });
  }
  
  return jsonResponse({ success: true });
}

function addEquipment(ss, data) {
  const sheet = ss.getSheetByName('Eq_Data_Base');
  if (!sheet) return jsonResponse({ success: false, error: 'Inventory sheet not found' });
  const lastRow = sheet.getLastRow();
  sheet.appendRow([
    lastRow,
    data.simNo,
    data.type,
    data.description,
    data.qty,
    data.serialNo,
    data.location
  ]);
  return jsonResponse({ success: true });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
