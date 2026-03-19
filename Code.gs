const VERCEL_URL = 'https://ais-dev-bn2ldncnfht3zuopoew4uo-207679608621.asia-east1.run.app';

function getSettings(ss) {
  let sheet = ss.getSheetByName('Settings');
  if (!sheet) {
    sheet = ss.insertSheet('Settings');
    sheet.appendRow(['Key', 'Value']);
    sheet.appendRow(['HOD_EMAIL', 'atharvagijare111@gmail.com']);
    sheet.appendRow(['MANAGER_EMAIL', 'atharva.gijare@simc.edu.in']);
  }
  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    settings[data[i][0]] = data[i][1];
  }
  return settings;
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
    const sheet = ss.getSheetByName('Requests');
    if (!sheet) return jsonResponse([]);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let requests = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const req = {};
      headers.forEach((h, idx) => req[h] = row[idx]);
      
      if (role === 'student' && req.StudentPRN.toString() === prn) {
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
    const sheet = ss.getSheetByName('Requests');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let results = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        const req = {};
        headers.forEach((h, idx) => req[h] = data[i][idx]);
        results.push(req);
      }
    }
    return jsonResponse(results);
  }

  if (action === 'getAdminData') {
    const settings = getSettings(ss);
    const studentSheet = ss.getSheetByName('Students Full DataBase');
    const studentData = studentSheet.getDataRange().getValues();
    const students = [];
    for (let i = 1; i < studentData.length; i++) {
      students.push({
        prn: studentData[i][0],
        name: studentData[i][1],
        specialization: studentData[i][2],
        semester: studentData[i][3]
      });
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

  if (action === 'updateSettings') {
    const sheet = ss.getSheetByName('Settings');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === 'HOD_EMAIL') sheet.getRange(i + 1, 2).setValue(data.hodEmail);
      if (rows[i][0] === 'MANAGER_EMAIL') sheet.getRange(i + 1, 2).setValue(data.managerEmail);
    }
    return jsonResponse({ success: true });
  }

  if (action === 'deleteRequest') {
    const sheet = ss.getSheetByName('Requests');
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    for (let i = values.length - 1; i >= 1; i--) {
      if (values[i][0] === data.requestId) {
        sheet.deleteRow(i + 1);
      }
    }
    return jsonResponse({ success: true });
  }
}

function getInventoryData(ss) {
  const eqSheet = ss.getSheetByName('Eq_Data_Base');
  const reqSheet = ss.getSheetByName('Requests');
  
  const eqData = eqSheet.getDataRange().getValues();
  const reqData = reqSheet ? reqSheet.getDataRange().getValues() : [];
  
  // Count issued items per type
  const issuedCounts = {};
  if (reqData.length > 1) {
    const headers = reqData[0];
    const typeIdx = headers.indexOf('EquipmentType');
    const statusIdx = headers.indexOf('ManagerStatus');
    for (let i = 1; i < reqData.length; i++) {
      if (reqData[i][statusIdx] === 'Issued') {
        const type = reqData[i][typeIdx];
        issuedCounts[type] = (issuedCounts[type] || 0) + 1;
      }
    }
  }
  
  // Group by type
  const inventory = {};
  for (let i = 1; i < eqData.length; i++) {
    const type = eqData[i][2];
    const desc = eqData[i][3];
    const totalQty = parseInt(eqData[i][4]) || 0;
    
    if (!inventory[type]) {
      inventory[type] = {
        Type: type,
        Description: desc, // Using first description found for the type
        TotalQty: 0,
        IssuedQty: issuedCounts[type] || 0,
        AvailableQty: 0
      };
    }
    inventory[type].TotalQty += totalQty;
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
      'RequestID', 'StudentName', 'StudentPRN', 'StudentEmail', 'RequestDate', 
      'Purpose', 'FromDate', 'ReturnDate', 'EquipmentType', 'EquipmentDescription', 
      'SIMNo', 'HODStatus', 'ManagerStatus'
    ]);
  }
  
  const requestId = 'REQ-' + new Date().getTime();
  const requestDate = new Date();
  const startRow = sheet.getLastRow() + 1;
  const numItems = data.items.length;
  
  data.items.forEach(item => {
    sheet.appendRow([
      requestId, data.studentName, data.studentPRN, data.studentEmail, requestDate,
      data.purpose, data.fromDate, data.returnDate, item.type, item.description,
      '', 'Pending', 'Pending'
    ]);
  });
  
  // Merge common cells
  const mergeCols = [1, 2, 3, 4, 5, 6, 7, 8, 12, 13]; // A, B, C, D, E, F, G, H, L, M
  mergeCols.forEach(col => {
    sheet.getRange(startRow, col, numItems, 1).merge();
  });
  
  // Send Email to HOD
  const settings = getSettings(ss);
  const approveUrl = `${VERCEL_URL}/hod.html?id=${requestId}&action=approve`;
  const rejectUrl = `${VERCEL_URL}/hod.html?id=${requestId}&action=reject`;
  
  const emailBody = `
    <h3>New Equipment Request: ${requestId}</h3>
    <p><b>Student:</b> ${data.studentName} (${data.studentPRN})</p>
    <p><b>Purpose:</b> ${data.purpose}</p>
    <p><b>Duration:</b> ${data.fromDate} to ${data.returnDate}</p>
    <p><b>Equipment:</b></p>
    <ul>
      ${data.items.map(i => `<li>${i.description} (${i.type})</li>`).join('')}
    </ul>
    <p>
      <a href="${approveUrl}" style="background: green; color: white; padding: 10px; text-decoration: none;">Approve</a>
      &nbsp;
      <a href="${rejectUrl}" style="background: red; color: white; padding: 10px; text-decoration: none;">Reject</a>
    </p>
  `;
  
  MailApp.sendEmail({
    to: settings.HOD_EMAIL,
    subject: `New Equipment Request - ${data.studentName}`,
    htmlBody: emailBody
  });
  
  return jsonResponse({ success: true, requestId: requestId });
}

function updateHODStatus(ss, data) {
  const sheet = ss.getSheetByName('Requests');
  const rows = sheet.getDataRange().getValues();
  const settings = getSettings(ss);
  let studentEmail = '';
  let studentName = '';
  let equipmentList = [];
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.requestId) {
      sheet.getRange(i + 1, 12).setValue(data.status);
      studentEmail = rows[i][3];
      studentName = rows[i][1];
      equipmentList.push(rows[i][9]);
    }
  }
  
  if (data.status === 'Approved') {
    // Email Student
    MailApp.sendEmail({
      to: studentEmail,
      subject: 'Equipment Request Approved',
      body: `Your request ${data.requestId} has been approved by the HOD. Please collect the equipment from the manager.`
    });
    // Email Manager
    MailApp.sendEmail({
      to: settings.MANAGER_EMAIL,
      subject: `Issue Equipment - ${studentName}`,
      body: `HOD has approved the request ${data.requestId} for ${studentName}. Please issue the following equipment: \n\n ${equipmentList.join('\n')}`
    });
  } else {
    // Email Student Rejection
    MailApp.sendEmail({
      to: studentEmail,
      subject: 'Equipment Request Rejected',
      body: `Your request ${data.requestId} has been rejected by the HOD. \nReason: ${data.reason || 'Not specified'}`
    });
  }
  
  return jsonResponse({ success: true });
}

function updateSIMNumbers(ss, data) {
  const sheet = ss.getSheetByName('Requests');
  const rows = sheet.getDataRange().getValues();
  
  data.updates.forEach(update => {
    for (let i = 1; i < rows.length; i++) {
      // Find the specific row for this RequestID and EquipmentDescription
      if (rows[i][0] === data.requestId && rows[i][9] === update.description) {
        sheet.getRange(i + 1, 11).setValue(update.simNo);
        break;
      }
    }
  });
  
  return jsonResponse({ success: true });
}

function updateManagerStatus(ss, data) {
  const reqSheet = ss.getSheetByName('Requests');
  const reqRows = reqSheet.getDataRange().getValues();
  const eqSheet = ss.getSheetByName('Eq_Data_Base');
  const eqData = eqSheet.getDataRange().getValues();
  
  let studentEmail = '';
  let equipmentTypesToUpdate = [];
  
  for (let i = 1; i < reqRows.length; i++) {
    if (reqRows[i][0] === data.requestId) {
      reqSheet.getRange(i + 1, 13).setValue(data.status);
      studentEmail = reqRows[i][3];
      equipmentTypesToUpdate.push(reqRows[i][8]); // EquipmentType is Column I (index 8)
    }
  }
  
  // Update Inventory Qty
  const adjustment = (data.status === 'Issued') ? -1 : (data.status === 'Returned' ? 1 : 0);
  
  if (adjustment !== 0) {
    equipmentTypesToUpdate.forEach(type => {
      for (let j = 1; j < eqData.length; j++) {
        if (eqData[j][2] === type) { // Column C is Type (index 2)
          const currentQty = parseInt(eqData[j][4]) || 0; // Column E is Qty (index 4)
          eqSheet.getRange(j + 1, 5).setValue(currentQty + adjustment);
          break; // Update first match found for that type
        }
      }
    });
  }
  
  if (data.status === 'Issued') {
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
