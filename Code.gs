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
 * N (13) = Specialization
 * O (14) = AcademicYear
 * P (15) = MobileNumber
 * Q (16) = AssignmentSubmissionDate
 * R (17) = ConcernedFacultyName
 * S (18) = ConcernedFacultyEmail
 * T (19) = IssuingAuthority
 * U (20) = AgreementSigned
 * V (21) = ReturnCondition
 * W (22) = ReturnAgreementSigned
 */

/**
 * Helper to read Settings sheet
 */
function getSettings(ss) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      settings[data[i][0]] = data[i][1];
    }
  }
  return settings;
}

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
        // Copy common values: A, B, C, D, H, I, J, L, N, O, P, Q, R, S, U
        [0, 1, 2, 3, 7, 8, 9, 11, 13, 14, 15, 16, 17, 18, 20].forEach(idx => {
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
  
  if (action === 'getFaculty') {
    const sheet = ss.getSheetByName('Faculty');
    if (!sheet) return jsonResponse([]);
    const data = sheet.getDataRange().getValues();
    const faculty = [];
    for (let i = 1; i < data.length; i++) {
      faculty.push({ name: data[i][0], email: data[i][1] });
    }
    return jsonResponse(faculty);
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
      } else if (role === 'hod' && (req.HODStatus === 'Pending' || req.HODStatus === 'Need to Discuss')) {
        requests.push(req);
      } else if (role === 'manager' && req.HODStatus === 'Approved') {
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
    const settings = getSettings(ss);
    
    // Students
    const studentSheet = ss.getSheetByName('Students Full DataBase');
    const students = [];
    if (studentSheet) {
      const studentData = studentSheet.getDataRange().getValues();
      for (let i = 1; i < studentData.length; i++) {
        students.push({
          prn: studentData[i][0],
          name: studentData[i][1],
          specialization: studentData[i][2],
          semester: studentData[i][3],
          email: studentData[i][4] || '',
          mobile: studentData[i][5] || ''
        });
      }
    }

    // Faculty
    const facultySheet = ss.getSheetByName('Faculty');
    const faculty = [];
    if (facultySheet) {
      const facultyData = facultySheet.getDataRange().getValues();
      for (let i = 1; i < facultyData.length; i++) {
        faculty.push({ name: facultyData[i][0], email: facultyData[i][1] });
      }
    }

    // Inventory
    const inventory = getInventoryData(ss);

    // Requests
    const reqInfo = getRequestsData(ss);
    const headers = reqInfo.headers;
    const rows = reqInfo.rows;
    const requests = rows.map(row => {
      const req = {};
      headers.forEach((h, idx) => req[h] = row[idx]);
      return req;
    });

    return jsonResponse({
      settings: settings,
      students: students,
      faculty: faculty,
      inventory: inventory,
      requests: requests
    });
  }

  if (action === 'getAvailableSIMs') {
    const description = e.parameter.description;
    return jsonResponse(getAvailableSIMs(ss, description));
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
  
  if (action === 'updatePartialApproval') {
    return updatePartialApproval(ss, data);
  }
  
  if (action === 'updateSIMNumbers') {
    return updateSIMNumbers(ss, data);
  }
  
  if (action === 'updateManagerStatus') {
    return updateManagerStatus(ss, data);
  }
  
  if (action === 'manageInventory') {
    return manageInventory(ss, data);
  }

  if (action === 'manageStudent') {
    return manageStudent(ss, data);
  }

  if (action === 'manageFaculty') {
    return manageFaculty(ss, data);
  }

  if (action === 'updateSettings') {
    return updateSettings(ss, data);
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
  
  const issuedCounts = {};
  const reqInfo = getRequestsData(ss);
  if (reqInfo.rows) {
    const rows = reqInfo.rows;
    const descIdx = 5; 
    const qtyIdx = 6;  
    const statusIdx = 12; 
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][statusIdx] === 'Issued') {
        const desc = rows[i][descIdx];
        const qty = parseInt(rows[i][qtyIdx]) || 1;
        issuedCounts[desc] = (issuedCounts[desc] || 0) + qty;
      }
    }
  }
  
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
      'SubmittedOn', 'HODStatus', 'ManagerStatus', 'Specialization', 'AcademicYear',
      'MobileNumber', 'AssignmentSubmissionDate', 'ConcernedFacultyName', 'ConcernedFacultyEmail',
      'IssuingAuthority', 'AgreementSigned', 'ReturnCondition', 'ReturnAgreementSigned'
    ]);
  }
  
  let counterSheet = ss.getSheetByName('Counter');
  if (!counterSheet) {
    counterSheet = ss.insertSheet('Counter');
    counterSheet.appendRow(['Year', 'LastNumber']);
  }
  
  const currentYear = new Date().getFullYear();
  const counterData = counterSheet.getDataRange().getValues();
  let lastNumber = 0;
  let yearRowIndex = -1;
  
  for (let i = 1; i < counterData.length; i++) {
    if (counterData[i][0].toString() === currentYear.toString()) {
      lastNumber = parseInt(counterData[i][1]);
      yearRowIndex = i + 1;
      break;
    }
  }
  
  const nextNumber = lastNumber + 1;
  const requestId = currentYear + '-' + nextNumber.toString().padStart(3, '0');
  
  if (yearRowIndex !== -1) {
    counterSheet.getRange(yearRowIndex, 2).setValue(nextNumber);
  } else {
    counterSheet.appendRow([currentYear, nextNumber]);
  }
  
  const requestDate = new Date();
  const startRow = sheet.getLastRow() + 1;
  const numItems = data.items.length;
  
  data.items.forEach(item => {
    sheet.appendRow([
      requestId, data.studentName, data.studentPRN, data.studentEmail, 
      '', 
      item.description, 
      item.qty || 1, 
      data.purpose, 
      data.fromDate, 
      data.returnDate, 
      requestDate, 
      'Pending', 
      'Pending', 
      data.specialization, 
      data.academicYear, 
      data.mobileNumber, 
      data.assignmentSubmissionDate, 
      data.concernedFacultyName, 
      data.concernedFacultyEmail, 
      '', 
      'No', 
      '', 
      'No' 
    ]);
  });
  
  const mergeCols = [1, 2, 3, 4, 8, 9, 10, 12, 14, 15, 16, 17, 18, 19, 21];
  if (numItems > 1) {
    mergeCols.forEach(col => {
      sheet.getRange(startRow, col, numItems, 1).merge();
    });
  }
  
  const approveUrl = `${VERCEL_URL}/faculty.html?id=${requestId}&action=approve`;
  const partialUrl = `${VERCEL_URL}/faculty.html?id=${requestId}&action=partial`;
  const rejectUrl = `${VERCEL_URL}/faculty.html?id=${requestId}&action=reject`;
  
  const emailBody = `
    <h2 style="color:#CF2E2E">Equipment Issuance Request — ${requestId}</h2>
    <hr>

    <h3>Student Details</h3>
    <p><b>Name:</b> ${data.studentName} (${data.studentPRN})</p>
    <p><b>Specialization:</b> ${data.specialization}</p>
    <p><b>Mobile:</b> ${data.mobileNumber}</p>

    <h3>Request Details</h3>
    <p><b>Purpose of Issuance:</b> ${data.purpose}</p>
    <p><b>Assignment Submission Date:</b> ${data.assignmentSubmissionDate}</p>
    <p><b>Equipment Issue Duration:</b> ${data.fromDate} to ${data.returnDate}</p>

    <h3>Equipment Requested</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
      <tr style="background:#f5f5f5">
        <th>Sr. No</th>
        <th>Equipment</th>
        <th>Qty Requested</th>
      </tr>
      ${data.items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.description}</td>
          <td>${item.qty || 1}</td>
        </tr>
      `).join('')}
    </table>

    <br><br>
    <a href="${approveUrl}" style="background:green;color:white;padding:12px 24px;text-decoration:none;margin-right:10px;border-radius:4px;">✓ Approve All</a>
    <a href="${partialUrl}" style="background:#FF8C00;color:white;padding:12px 24px;text-decoration:none;margin-right:10px;border-radius:4px;">⚡ Partial Approval</a>
    <a href="${rejectUrl}" style="background:#CC0000;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">✗ Not Approved / Need to Discuss</a>
  `;
  
  MailApp.sendEmail({
    to: data.concernedFacultyEmail,
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
  
  let lastRequestID = '';
  for (let i = 1; i < rows.length; i++) {
    const currentID = rows[i][0] || lastRequestID;
    if (currentID === data.requestId) {
      sheet.getRange(i + 1, 12).setValue(data.status); 
      if (rows[i][0]) { 
        studentEmail = rows[i][3];
        studentName = rows[i][1];
      }
      equipmentList.push(rows[i][5]); 
    }
    if (rows[i][0]) lastRequestID = rows[i][0];
  }
  
  if (data.status === 'Approved') {
    if (studentEmail) {
      MailApp.sendEmail({
        to: studentEmail,
        subject: 'Equipment Request Approved',
        body: `Your request ${data.requestId} has been approved by the Faculty. Please collect the equipment from the manager.`
      });
    }
    const managerEmail = settings.MANAGER_EMAIL || 'atharva.gijare@simc.edu.in';
    MailApp.sendEmail({
      to: managerEmail,
      subject: `Issue Equipment - ${studentName}`,
      body: `Faculty has approved the request ${data.requestId} for ${studentName}. Please issue the following equipment: \n\n ${equipmentList.join('\n')}`
    });
  } else if (data.status === 'Need to Discuss') {
    if (studentEmail) {
      MailApp.sendEmail({
        to: studentEmail,
        subject: 'Equipment Request - Discussion Required',
        body: `Your request ${data.requestId} requires discussion. Please contact your faculty.`
      });
    }
  } else {
    if (studentEmail) {
      MailApp.sendEmail({
        to: studentEmail,
        subject: 'Equipment Request Rejected',
        body: `Your request ${data.requestId} has been rejected by the Faculty. \nReason: ${data.reason || 'Not specified'}`
      });
    }
  }
  
  return jsonResponse({ success: true });
}

function updatePartialApproval(ss, data) {
  const sheet = ss.getSheetByName('Requests');
  const rows = sheet.getDataRange().getValues();
  const settings = getSettings(ss);
  let studentEmail = '';
  let studentName = '';
  let approvedItems = [];
  let breakdown = [];
  
  data.decisions.forEach(decision => {
    let lastRequestID = '';
    for (let i = 1; i < rows.length; i++) {
      const currentID = rows[i][0] || lastRequestID;
      if (currentID === data.requestId && rows[i][5] === decision.description) {
        sheet.getRange(i + 1, 12).setValue(decision.status);
        if (rows[i][0]) {
          studentEmail = rows[i][3];
          studentName = rows[i][1];
        }
        breakdown.push(`${decision.description}: ${decision.status}`);
        if (decision.status === 'Approved') {
          approvedItems.push(decision.description);
        }
        break;
      }
      if (rows[i][0]) lastRequestID = rows[i][0];
    }
  });

  if (studentEmail) {
    MailApp.sendEmail({
      to: studentEmail,
      subject: `Equipment Request Partial Decision - ${data.requestId}`,
      body: `Your request ${data.requestId} has been reviewed. Here is the breakdown of decisions:\n\n${breakdown.join('\n')}\n\nPlease contact your faculty for items marked 'Need to Discuss'.`
    });
  }

  if (approvedItems.length > 0) {
    const managerEmail = settings.MANAGER_EMAIL || 'atharva.gijare@simc.edu.in';
    MailApp.sendEmail({
      to: managerEmail,
      subject: `Issue Equipment (Partial) - ${studentName}`,
      body: `Faculty has partially approved the request ${data.requestId} for ${studentName}. Please issue the following approved equipment: \n\n ${approvedItems.join('\n')}`
    });
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
        sheet.getRange(i + 1, 5).setValue(update.simNo); 
        break;
      }
      if (rows[i][0]) lastRequestID = rows[i][0];
    }
  });

  if (data.agreementSigned) {
    let lastRequestID = '';
    for (let i = 1; i < rows.length; i++) {
      const currentID = rows[i][0] || lastRequestID;
      if (currentID === data.requestId) {
        sheet.getRange(i + 1, 21).setValue('Yes'); 
      }
      if (rows[i][0]) lastRequestID = rows[i][0];
    }
  }
  
  return jsonResponse({ success: true });
}

function updateManagerStatus(ss, data) {
  const reqSheet = ss.getSheetByName('Requests');
  const reqRows = reqSheet.getDataRange().getValues();
  const eqSheet = ss.getSheetByName('Eq_Data_Base');
  if (!eqSheet) return jsonResponse({ success: false, error: 'Inventory sheet not found' });
  const eqData = eqSheet.getDataRange().getValues();
  
  let lastRequestID = '';
  let targetRowIndex = -1;
  
  for (let i = 1; i < reqRows.length; i++) {
    const currentID = reqRows[i][0] || lastRequestID;
    if (currentID === data.requestId && reqRows[i][5] === data.equipmentDescription) {
      targetRowIndex = i + 1;
      reqSheet.getRange(targetRowIndex, 13).setValue(data.status); 
      
      if (data.status === 'Issued') {
        reqSheet.getRange(targetRowIndex, 20).setValue(data.issuingAuthority); 
      } else if (data.status === 'Returned') {
        reqSheet.getRange(targetRowIndex, 22).setValue(data.returnCondition); 
        if (data.returnAgreementSigned) {
          reqSheet.getRange(targetRowIndex, 23).setValue('Yes'); 
        }
      }
    }
    if (reqRows[i][0]) lastRequestID = reqRows[i][0];
  }
  
  if (targetRowIndex === -1) return jsonResponse({ success: false, error: 'Row not found' });

  const adjustment = (data.status === 'Issued') ? -1 : (data.status === 'Returned' ? 1 : 0);
  
  if (adjustment !== 0) {
    for (let j = 1; j < eqData.length; j++) {
      if (eqData[j][3] === data.equipmentDescription) { 
        const currentQty = parseInt(eqData[j][4]) || 0;
        eqSheet.getRange(j + 1, 5).setValue(currentQty + (adjustment * 1)); 
        break;
      }
    }
  }

  if (data.status === 'Issued') {
    const updatedReqRows = reqSheet.getDataRange().getValues();
    let allIssued = true;
    let requestItems = [];
    let studentInfo = {};
    
    lastRequestID = '';
    for (let i = 1; i < updatedReqRows.length; i++) {
      const currentID = updatedReqRows[i][0] || lastRequestID;
      if (currentID === data.requestId) {
        if (updatedReqRows[i][12] !== 'Issued') allIssued = false;
        requestItems.push({
          description: updatedReqRows[i][5],
          simNo: updatedReqRows[i][4]
        });
        if (updatedReqRows[i][0]) {
          studentInfo = {
            name: updatedReqRows[i][1],
            prn: updatedReqRows[i][2],
            email: updatedReqRows[i][3],
            specialization: updatedReqRows[i][13],
            academicYear: updatedReqRows[i][14],
            mobile: updatedReqRows[i][15],
            fromDate: updatedReqRows[i][8],
            returnDate: updatedReqRows[i][9],
            assignmentDate: updatedReqRows[i][16],
            purpose: updatedReqRows[i][7],
            faculty: updatedReqRows[i][17],
            authority: updatedReqRows[i][19]
          };
        }
      }
      if (updatedReqRows[i][0]) lastRequestID = updatedReqRows[i][0];
    }
    
    if (allIssued) {
      generateIssuancePDF(data.requestId, studentInfo, requestItems);
    }
  }
  
  return jsonResponse({ success: true });
}

function generateIssuancePDF(requestId, student, items) {
  const date = new Date().toLocaleDateString();
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 40px; border: 1px solid #eee;">
      <h1 style="text-align: center; color: #333;">SIMC Equipment Portal</h1>
      <h2 style="text-align: center; color: #666;">Equipment Issuance Receipt</h2>
      <hr>
      <p><b>Request ID:</b> ${requestId}</p>
      <p><b>Date of Issue:</b> ${date}</p>
      
      <h3>STUDENT DETAILS</h3>
      <p><b>Name:</b> ${student.name}</p>
      <p><b>PRN:</b> ${student.prn}</p>
      <p><b>Specialization:</b> ${student.specialization}</p>
      <p><b>Academic Year:</b> ${student.academicYear}</p>
      <p><b>Mobile:</b> ${student.mobile}</p>
      
      <h3>EQUIPMENT DETAILS</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #f9f9f9;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">SIM No</th>
        </tr>
        ${items.map(item => `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.description}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.simNo}</td>
          </tr>
        `).join('')}
      </table>
      
      <h3>ISSUE DETAILS</h3>
      <p><b>Issue Period:</b> ${student.fromDate} to ${student.returnDate}</p>
      <p><b>Assignment Due Date:</b> ${student.assignmentDate}</p>
      <p><b>Purpose:</b> ${student.purpose}</p>
      <p><b>Concerned Faculty:</b> ${student.faculty}</p>
      <p><b>Issuing Authority:</b> ${student.authority}</p>
      <p><b>Student Agreement:</b> Signed</p>
      
      <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #999;">
        This is a computer-generated receipt.
      </div>
    </div>
  `;
  
  const blob = Utilities.newBlob(html, 'text/html', `Receipt_${requestId}.html`);
  const tempFile = DriveApp.createFile(blob);
  const pdf = tempFile.getAs('application/pdf');
  pdf.setName(`Receipt_${requestId}.pdf`);
  
  MailApp.sendEmail({
    to: student.email,
    subject: `Equipment Issuance Receipt — ${requestId}`,
    body: `Please find attached the issuance receipt for your equipment request ${requestId}.`,
    attachments: [pdf]
  });
  
  tempFile.setTrashed(true);
}

function manageInventory(ss, data) {
  const sheet = ss.getSheetByName('Eq_Data_Base');
  if (!sheet) return jsonResponse({ success: false });
  const values = sheet.getDataRange().getValues();
  
  if (data.delete) {
    for (let i = values.length - 1; i >= 1; i--) {
      if (values[i][3] === data.description) {
        sheet.deleteRow(i + 1);
      }
    }
  } else if (data.oldDescription) {
    for (let i = 1; i < values.length; i++) {
      if (values[i][3] === data.oldDescription) {
        sheet.getRange(i + 1, 3).setValue(data.type);
        sheet.getRange(i + 1, 4).setValue(data.description);
        sheet.getRange(i + 1, 5).setValue(data.totalQty);
      }
    }
  } else {
    sheet.appendRow(['', '', data.type, data.description, data.totalQty, '', '']);
  }
  return jsonResponse({ success: true });
}

function manageStudent(ss, data) {
  const sheet = ss.getSheetByName('Students Full DataBase');
  if (!sheet) return jsonResponse({ success: false });
  const values = sheet.getDataRange().getValues();
  
  if (data.delete) {
    for (let i = values.length - 1; i >= 1; i--) {
      if (values[i][0].toString() === data.prn.toString()) {
        sheet.deleteRow(i + 1);
      }
    }
  } else if (data.oldPrn) {
    for (let i = 1; i < values.length; i++) {
      if (values[i][0].toString() === data.oldPrn.toString()) {
        sheet.getRange(i + 1, 1).setValue(data.prn);
        sheet.getRange(i + 1, 2).setValue(data.name);
        sheet.getRange(i + 1, 3).setValue(data.specialization);
        sheet.getRange(i + 1, 4).setValue(data.semester);
      }
    }
  } else {
    sheet.appendRow([data.prn, data.name, data.specialization, data.semester]);
  }
  return jsonResponse({ success: true });
}

function manageFaculty(ss, data) {
  const sheet = ss.getSheetByName('Faculty');
  if (!sheet) return jsonResponse({ success: false });
  const values = sheet.getDataRange().getValues();
  
  if (data.delete) {
    for (let i = values.length - 1; i >= 1; i--) {
      if (values[i][1] === data.email) {
        sheet.deleteRow(i + 1);
      }
    }
  } else if (data.oldEmail) {
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === data.oldEmail) {
        sheet.getRange(i + 1, 1).setValue(data.name);
        sheet.getRange(i + 1, 2).setValue(data.email);
      }
    }
  } else {
    sheet.appendRow([data.name, data.email]);
  }
  return jsonResponse({ success: true });
}

function updateSettings(ss, data) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return jsonResponse({ success: false });
  const values = sheet.getDataRange().getValues();
  
  const updates = {
    'MANAGER_EMAIL': data.managerEmail,
    'FINE_PER_DAY': data.finePerDay
  };
  
  for (let key in updates) {
    let found = false;
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(updates[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, updates[key]]);
    }
  }
  return jsonResponse({ success: true });
}

function getAvailableSIMs(ss, description) {
  const eqSheet = ss.getSheetByName('Eq_Data_Base');
  if (!eqSheet) return [];
  const eqData = eqSheet.getDataRange().getValues();
  
  const issuedSIMs = new Set();
  const reqInfo = getRequestsData(ss);
  if (reqInfo.rows) {
    const rows = reqInfo.rows;
    const simIdx = 4; 
    const descIdx = 5; 
    const statusIdx = 12; 
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][descIdx] === description && rows[i][statusIdx] === 'Issued') {
        if (rows[i][simIdx]) issuedSIMs.add(rows[i][simIdx].toString());
      }
    }
  }
  
  const available = [];
  for (let i = 1; i < eqData.length; i++) {
    const simNo = eqData[i][1].toString();
    const desc = eqData[i][3];
    const location = eqData[i][6];
    
    if (desc === description && !issuedSIMs.has(simNo)) {
      available.push({
        simNo: simNo,
        location: location
      });
    }
  }
  return available;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
