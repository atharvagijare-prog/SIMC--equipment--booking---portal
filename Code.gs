const VERCEL_URL = 'https://ais-dev-bn2ldncnfht3zuopoew4uo-207679608621.asia-east1.run.app';

/**
 * ACTUAL COLUMN STRUCTURE (Requests Sheet - Updated based on user's screenshot):
 * A (0) = ReturnDate
 * B (1) = SubmittedOn
 * C (2) = FacultyStatus (HODStatus)
 * D (3) = ManagerStatus
 * E (4) = Specialization (Batch & Specialization)
 * F (5) = AcademicYear (Semester Number)
 * G (6) = MobileNumber (Phone Number)
 * H (7) = AssignmentSubmissionDate (Submission Date)
 * I (8) = ConcernedFacultyName (Concerned Faculty)
 * J (9) = ConcernedFacultyEmail (FacultyEmail)
 * K (10) = IssuingAuthority
 * L (11) = ReturnCondition
 * M (12) = NotesFromManager
 * N (13) = RequestID
 * O (14) = StudentName
 * P (15) = StudentPRN
 * Q (16) = StudentEmail
 * R (17) = EquipmentSIMNo
 * S (18) = EquipmentDescription
 * T (19) = Quantity
 * U (20) = Purpose
 * V (21) = FromDate
 * W (22) = AgreementSigned
 * X (23) = ReturnAgreementSigned
 */

// Column Indices
const COL_RETURN_DATE = 0;
const COL_SUBMITTED_ON = 1;
const COL_FACULTY_STATUS = 2;
const COL_MANAGER_STATUS = 3;
const COL_SPECIALIZATION = 4;
const COL_ACADEMIC_YEAR = 5;
const COL_MOBILE_NUMBER = 6;
const COL_ASSIGNMENT_DATE = 7;
const COL_FACULTY_NAME = 8;
const COL_FACULTY_EMAIL = 9;
const COL_ISSUING_AUTHORITY = 10;
const COL_RETURN_CONDITION = 11;
const COL_NOTES_MANAGER = 12;
const COL_REQUEST_ID = 13;
const COL_STUDENT_NAME = 14;
const COL_STUDENT_PRN = 15;
const COL_STUDENT_EMAIL = 16;
const COL_SIM_NO = 17;
const COL_EQUIPMENT_DESC = 18;
const COL_QUANTITY = 19;
const COL_PURPOSE = 20;
const COL_FROM_DATE = 21;
const COL_AGREEMENT_SIGNED = 22;
const COL_RETURN_AGREEMENT = 23;

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
    // If RequestID is empty, it's likely a merged cell from the row above
    if (!row[COL_REQUEST_ID] || row[COL_REQUEST_ID].toString().trim() === "") { 
      if (lastRowData) {
        // Copy common values
        [
          COL_RETURN_DATE, COL_SUBMITTED_ON, COL_FACULTY_STATUS, COL_MANAGER_STATUS,
          COL_SPECIALIZATION, COL_ACADEMIC_YEAR, COL_MOBILE_NUMBER, COL_ASSIGNMENT_DATE,
          COL_FACULTY_NAME, COL_FACULTY_EMAIL, COL_REQUEST_ID, COL_STUDENT_NAME,
          COL_STUDENT_PRN, COL_STUDENT_EMAIL, COL_PURPOSE, COL_FROM_DATE, COL_AGREEMENT_SIGNED
        ].forEach(idx => {
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
          email: data[i][4] || '',
          mobile: data[i][5] || ''
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
    
    // Indices based on the structure defined at the top of the file
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Build request object with standardized keys
      const req = {
        ReturnDate: row[COL_RETURN_DATE],
        SubmittedOn: row[COL_SUBMITTED_ON],
        FacultyStatus: row[COL_FACULTY_STATUS],
        ManagerStatus: row[COL_MANAGER_STATUS],
        Specialization: row[COL_SPECIALIZATION],
        AcademicYear: row[COL_ACADEMIC_YEAR],
        MobileNumber: row[COL_MOBILE_NUMBER],
        AssignmentSubmissionDate: row[COL_ASSIGNMENT_DATE],
        ConcernedFacultyName: row[COL_FACULTY_NAME],
        ConcernedFacultyEmail: row[COL_FACULTY_EMAIL],
        IssuingAuthority: row[COL_ISSUING_AUTHORITY],
        ReturnCondition: row[COL_RETURN_CONDITION],
        NotesFromManager: row[COL_NOTES_MANAGER],
        RequestID: row[COL_REQUEST_ID],
        StudentName: row[COL_STUDENT_NAME],
        StudentPRN: row[COL_STUDENT_PRN],
        StudentEmail: row[COL_STUDENT_EMAIL],
        EquipmentSIMNo: row[COL_SIM_NO],
        EquipmentDescription: row[COL_EQUIPMENT_DESC],
        Quantity: row[COL_QUANTITY],
        Purpose: row[COL_PURPOSE],
        FromDate: row[COL_FROM_DATE],
        AgreementSigned: row[COL_AGREEMENT_SIGNED],
        ReturnAgreementSigned: row[COL_RETURN_AGREEMENT]
      };
      
      const facultyStatus = (row[COL_FACULTY_STATUS] || '').toString().trim();
      const managerStatus = (row[COL_MANAGER_STATUS] || '').toString().trim();
      const studentPrn = (row[COL_STUDENT_PRN] || '').toString().trim();

      if (role === 'student' && studentPrn === (prn || '').toString().trim()) {
        requests.push(req);
      } else if (role === 'faculty' && (facultyStatus === 'Pending' || facultyStatus === 'Need to Discuss')) {
        requests.push(req);
      } else if (role === 'manager' && facultyStatus === 'Approved') {
        requests.push(req);
      } else if (role === 'admin') {
        requests.push(req);
      }
    }
    return jsonResponse(requests);
  }
  
  if (action === 'getRequestById') {
    const id = (e.parameter.id || '').toString().trim();
    const reqInfo = getRequestsData(ss);
    const headers = reqInfo.headers;
    const rows = reqInfo.rows;
    let results = [];
    for (let i = 0; i < rows.length; i++) {
      const currentId = (rows[i][COL_REQUEST_ID] || '').toString().trim();
      if (currentId === id) {
        const req = {
          ReturnDate: rows[i][COL_RETURN_DATE],
          SubmittedOn: rows[i][COL_SUBMITTED_ON],
          FacultyStatus: rows[i][COL_FACULTY_STATUS],
          ManagerStatus: rows[i][COL_MANAGER_STATUS],
          Specialization: rows[i][COL_SPECIALIZATION],
          AcademicYear: rows[i][COL_ACADEMIC_YEAR],
          MobileNumber: rows[i][COL_MOBILE_NUMBER],
          AssignmentSubmissionDate: rows[i][COL_ASSIGNMENT_DATE],
          ConcernedFacultyName: rows[i][COL_FACULTY_NAME],
          ConcernedFacultyEmail: rows[i][COL_FACULTY_EMAIL],
          IssuingAuthority: rows[i][COL_ISSUING_AUTHORITY],
          ReturnCondition: rows[i][COL_RETURN_CONDITION],
          NotesFromManager: rows[i][COL_NOTES_MANAGER],
          RequestID: rows[i][COL_REQUEST_ID],
          StudentName: rows[i][COL_STUDENT_NAME],
          StudentPRN: rows[i][COL_STUDENT_PRN],
          StudentEmail: rows[i][COL_STUDENT_EMAIL],
          EquipmentSIMNo: rows[i][COL_SIM_NO],
          EquipmentDescription: rows[i][COL_EQUIPMENT_DESC],
          Quantity: rows[i][COL_QUANTITY],
          Purpose: rows[i][COL_PURPOSE],
          FromDate: rows[i][COL_FROM_DATE],
          AgreementSigned: rows[i][COL_AGREEMENT_SIGNED],
          ReturnAgreementSigned: rows[i][COL_RETURN_AGREEMENT]
        };
        results.push(req);
      } else if (!currentId) {
        // Handle merged rows
        let lastId = '';
        for(let j=i; j>=0; j--) {
          if(rows[j][COL_REQUEST_ID]) {
            lastId = rows[j][COL_REQUEST_ID].toString().trim();
            break;
          }
        }
        if(lastId === id) {
          const req = {
            ReturnDate: rows[i][COL_RETURN_DATE],
            SubmittedOn: rows[i][COL_SUBMITTED_ON],
            FacultyStatus: rows[i][COL_FACULTY_STATUS],
            ManagerStatus: rows[i][COL_MANAGER_STATUS],
            Specialization: rows[i][COL_SPECIALIZATION],
            AcademicYear: rows[i][COL_ACADEMIC_YEAR],
            MobileNumber: rows[i][COL_MOBILE_NUMBER],
            AssignmentSubmissionDate: rows[i][COL_ASSIGNMENT_DATE],
            ConcernedFacultyName: rows[i][COL_FACULTY_NAME],
            ConcernedFacultyEmail: rows[i][COL_FACULTY_EMAIL],
            IssuingAuthority: rows[i][COL_ISSUING_AUTHORITY],
            ReturnCondition: rows[i][COL_RETURN_CONDITION],
            NotesFromManager: rows[i][COL_NOTES_MANAGER],
            RequestID: rows[i][COL_REQUEST_ID],
            StudentName: rows[i][COL_STUDENT_NAME],
            StudentPRN: rows[i][COL_STUDENT_PRN],
            StudentEmail: rows[i][COL_STUDENT_EMAIL],
            EquipmentSIMNo: rows[i][COL_SIM_NO],
            EquipmentDescription: rows[i][COL_EQUIPMENT_DESC],
            Quantity: rows[i][COL_QUANTITY],
            Purpose: rows[i][COL_PURPOSE],
            FromDate: rows[i][COL_FROM_DATE],
            AgreementSigned: rows[i][COL_AGREEMENT_SIGNED],
            ReturnAgreementSigned: rows[i][COL_RETURN_AGREEMENT]
          };
          results.push(req);
        }
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
  
  if (action === 'updateFacultyStatus') {
    return updateFacultyStatus(ss, data);
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
      const targetId = (data.requestId || '').toString().trim();
      let lastId = '';
      for (let i = values.length - 1; i >= 1; i--) {
        const currentId = (values[i][COL_REQUEST_ID] || '').toString().trim() || lastId;
        if (currentId === targetId) {
          sheet.deleteRow(i + 1);
        }
        // Update lastId for the next iteration (going upwards)
        let rowId = values[i][COL_REQUEST_ID] ? values[i][COL_REQUEST_ID].toString().trim() : '';
        if (!rowId) {
          for (let j = i - 1; j >= 1; j--) {
            if (values[j][COL_REQUEST_ID]) {
              rowId = values[j][COL_REQUEST_ID].toString().trim();
              break;
            }
          }
        }
        if (rowId === targetId) {
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
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][COL_MANAGER_STATUS] === 'Issued') {
        const desc = rows[i][COL_EQUIPMENT_DESC];
        const qty = parseInt(rows[i][COL_QUANTITY]) || 1;
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
      'ReturnDate', 'SubmittedOn', 'FacultyStatus', 'ManagerStatus', 'Specialization', 
      'AcademicYear', 'MobileNumber', 'AssignmentSubmissionDate', 'ConcernedFacultyName', 'ConcernedFacultyEmail', 
      'IssuingAuthority', 'ReturnCondition', 'NotesFromManager', 'RequestID', 'StudentName',
      'StudentPRN', 'StudentEmail', 'EquipmentSIMNo', 'EquipmentDescription', 'Quantity',
      'Purpose', 'FromDate', 'AgreementSigned', 'ReturnAgreementSigned'
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
    const row = [];
    row[COL_RETURN_DATE] = data.returnDate;
    row[COL_SUBMITTED_ON] = requestDate;
    row[COL_FACULTY_STATUS] = 'Pending';
    row[COL_MANAGER_STATUS] = 'Pending';
    row[COL_SPECIALIZATION] = data.specialization;
    row[COL_ACADEMIC_YEAR] = data.academicYear;
    row[COL_MOBILE_NUMBER] = data.mobileNumber;
    row[COL_ASSIGNMENT_DATE] = data.assignmentSubmissionDate;
    row[COL_FACULTY_NAME] = data.concernedFacultyName;
    row[COL_FACULTY_EMAIL] = data.concernedFacultyEmail;
    row[COL_ISSUING_AUTHORITY] = '';
    row[COL_RETURN_CONDITION] = '';
    row[COL_NOTES_MANAGER] = '';
    row[COL_REQUEST_ID] = requestId;
    row[COL_STUDENT_NAME] = data.studentName;
    row[COL_STUDENT_PRN] = data.studentPRN;
    row[COL_STUDENT_EMAIL] = data.studentEmail;
    row[COL_SIM_NO] = '';
    row[COL_EQUIPMENT_DESC] = item.description;
    row[COL_QUANTITY] = item.qty || 1;
    row[COL_PURPOSE] = data.purpose;
    row[COL_FROM_DATE] = data.fromDate;
    row[COL_AGREEMENT_SIGNED] = 'No';
    row[COL_RETURN_AGREEMENT] = 'No';
    
    sheet.appendRow(row);
  });
  
  const mergeCols = [
    COL_RETURN_DATE + 1, COL_SUBMITTED_ON + 1, COL_FACULTY_STATUS + 1, COL_MANAGER_STATUS + 1,
    COL_SPECIALIZATION + 1, COL_ACADEMIC_YEAR + 1, COL_MOBILE_NUMBER + 1, COL_ASSIGNMENT_DATE + 1,
    COL_FACULTY_NAME + 1, COL_FACULTY_EMAIL + 1, COL_REQUEST_ID + 1, COL_STUDENT_NAME + 1,
    COL_STUDENT_PRN + 1, COL_STUDENT_EMAIL + 1, COL_PURPOSE + 1, COL_FROM_DATE + 1, COL_AGREEMENT_SIGNED + 1
  ];
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

function updateFacultyStatus(ss, data) {
  const sheet = ss.getSheetByName('Requests');
  const rows = sheet.getDataRange().getValues();
  const settings = getSettings(ss);
  let studentEmail = '';
  let studentName = '';
  let equipmentList = [];
  
  let lastRequestID = '';
  for (let i = 1; i < rows.length; i++) {
    const currentID = rows[i][COL_REQUEST_ID] || lastRequestID;
    if (currentID === data.requestId) {
      sheet.getRange(i + 1, COL_FACULTY_STATUS + 1).setValue(data.status); 
      if (rows[i][COL_REQUEST_ID]) { 
        studentEmail = rows[i][COL_STUDENT_EMAIL];
        studentName = rows[i][COL_STUDENT_NAME];
      }
      equipmentList.push(rows[i][COL_EQUIPMENT_DESC]); 
    }
    if (rows[i][COL_REQUEST_ID]) lastRequestID = rows[i][COL_REQUEST_ID];
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
      const currentID = rows[i][COL_REQUEST_ID] || lastRequestID;
      if (currentID === data.requestId && rows[i][COL_EQUIPMENT_DESC] === decision.description) {
        sheet.getRange(i + 1, COL_FACULTY_STATUS + 1).setValue(decision.status);
        if (rows[i][COL_REQUEST_ID]) {
          studentEmail = rows[i][COL_STUDENT_EMAIL];
          studentName = rows[i][COL_STUDENT_NAME];
        }
        breakdown.push(`${decision.description}: ${decision.status}`);
        if (decision.status === 'Approved') {
          approvedItems.push(decision.description);
        }
        break;
      }
      if (rows[i][COL_REQUEST_ID]) lastRequestID = rows[i][COL_REQUEST_ID];
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
  const targetId = (data.requestId || '').toString().trim();
  
  data.updates.forEach(update => {
    let lastRequestID = '';
    const targetDesc = (update.description || '').toString().trim();
    for (let i = 1; i < rows.length; i++) {
      const currentID = (rows[i][COL_REQUEST_ID] || '').toString().trim() || lastRequestID;
      const currentDesc = (rows[i][COL_EQUIPMENT_DESC] || '').toString().trim();
      if (currentID === targetId && currentDesc === targetDesc) {
        sheet.getRange(i + 1, COL_SIM_NO + 1).setValue(update.simNo); 
        break;
      }
      if (rows[i][COL_REQUEST_ID]) lastRequestID = rows[i][COL_REQUEST_ID].toString().trim();
    }
  });

  if (data.agreementSigned) {
    let lastRequestID = '';
    for (let i = 1; i < rows.length; i++) {
      const currentID = (rows[i][COL_REQUEST_ID] || '').toString().trim() || lastRequestID;
      if (currentID === targetId) {
        sheet.getRange(i + 1, COL_AGREEMENT_SIGNED + 1).setValue('Yes'); 
      }
      if (rows[i][COL_REQUEST_ID]) lastRequestID = rows[i][COL_REQUEST_ID].toString().trim();
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
    const currentID = reqRows[i][COL_REQUEST_ID] || lastRequestID;
    if (currentID === data.requestId && reqRows[i][COL_EQUIPMENT_DESC] === data.equipmentDescription) {
      targetRowIndex = i + 1;
      reqSheet.getRange(targetRowIndex, COL_MANAGER_STATUS + 1).setValue(data.status); 
      
      if (data.status === 'Issued') {
        reqSheet.getRange(targetRowIndex, COL_ISSUING_AUTHORITY + 1).setValue(data.issuingAuthority); 
      } else if (data.status === 'Returned') {
        reqSheet.getRange(targetRowIndex, COL_RETURN_CONDITION + 1).setValue(data.returnCondition); 
        if (data.returnAgreementSigned) {
          reqSheet.getRange(targetRowIndex, COL_RETURN_AGREEMENT + 1).setValue('Yes'); 
        }
      }
    }
    if (reqRows[i][COL_REQUEST_ID]) lastRequestID = reqRows[i][COL_REQUEST_ID];
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
      const currentID = updatedReqRows[i][COL_REQUEST_ID] || lastRequestID;
      if (currentID === data.requestId) {
        if (updatedReqRows[i][COL_MANAGER_STATUS] !== 'Issued') allIssued = false;
        requestItems.push({
          description: updatedReqRows[i][COL_EQUIPMENT_DESC],
          simNo: updatedReqRows[i][COL_SIM_NO]
        });
        if (updatedReqRows[i][COL_REQUEST_ID]) {
          studentInfo = {
            name: updatedReqRows[i][COL_STUDENT_NAME],
            prn: updatedReqRows[i][COL_STUDENT_PRN],
            email: updatedReqRows[i][COL_STUDENT_EMAIL],
            specialization: updatedReqRows[i][COL_SPECIALIZATION],
            academicYear: updatedReqRows[i][COL_ACADEMIC_YEAR],
            mobile: updatedReqRows[i][COL_MOBILE_NUMBER],
            fromDate: updatedReqRows[i][COL_FROM_DATE],
            returnDate: updatedReqRows[i][COL_RETURN_DATE],
            assignmentDate: updatedReqRows[i][COL_ASSIGNMENT_DATE],
            purpose: updatedReqRows[i][COL_PURPOSE],
            faculty: updatedReqRows[i][COL_FACULTY_NAME],
            authority: updatedReqRows[i][COL_ISSUING_AUTHORITY]
          };
        }
      }
      if (updatedReqRows[i][COL_REQUEST_ID]) lastRequestID = updatedReqRows[i][COL_REQUEST_ID];
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
    const targetDesc = (data.description || '').toString().trim();
    for (let i = values.length - 1; i >= 1; i--) {
      if (values[i][3].toString().trim() === targetDesc) {
        sheet.deleteRow(i + 1);
      }
    }
  } else if (data.oldDescription) {
    const targetOldDesc = (data.oldDescription || '').toString().trim();
    for (let i = 1; i < values.length; i++) {
      if (values[i][3].toString().trim() === targetOldDesc) {
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
    const targetPrn = (data.prn || '').toString().trim();
    for (let i = values.length - 1; i >= 1; i--) {
      if (values[i][0].toString().trim() === targetPrn) {
        sheet.deleteRow(i + 1);
      }
    }
  } else if (data.oldPrn) {
    const targetOldPrn = (data.oldPrn || '').toString().trim();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0].toString().trim() === targetOldPrn) {
        sheet.getRange(i + 1, 1).setValue(data.prn);
        sheet.getRange(i + 1, 2).setValue(data.name);
        sheet.getRange(i + 1, 5).setValue(data.email);
        sheet.getRange(i + 1, 6).setValue(data.mobile);
      }
    }
  } else {
    const newRow = [data.prn, data.name, '', '', data.email, data.mobile];
    sheet.appendRow(newRow);
  }
  return jsonResponse({ success: true });
}

function manageFaculty(ss, data) {
  const sheet = ss.getSheetByName('Faculty');
  if (!sheet) return jsonResponse({ success: false });
  const values = sheet.getDataRange().getValues();
  
  if (data.delete) {
    const targetEmail = (data.email || '').toString().trim();
    for (let i = values.length - 1; i >= 1; i--) {
      if (values[i][1].toString().trim() === targetEmail) {
        sheet.deleteRow(i + 1);
      }
    }
  } else if (data.oldEmail) {
    const targetOldEmail = (data.oldEmail || '').toString().trim();
    for (let i = 1; i < values.length; i++) {
      if (values[i][1].toString().trim() === targetOldEmail) {
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
    const simIdx = COL_SIM_NO; 
    const descIdx = COL_EQUIPMENT_DESC; 
    const statusIdx = COL_MANAGER_STATUS; 
    const facultyStatusIdx = COL_FACULTY_STATUS;
    for (let i = 0; i < rows.length; i++) {
      const simNo = rows[i][simIdx];
      const mStatus = rows[i][statusIdx];
      const fStatus = rows[i][facultyStatusIdx];
      if (simNo && mStatus !== 'Returned' && fStatus !== 'Rejected') {
        issuedSIMs.add(simNo.toString());
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
