import XLSX from 'xlsx';

export class ExcelService {
  exportToExcel(data: any[], filename: string) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, filename);
  }

  importFromExcel(filepath: string) {
    const wb = XLSX.readFile(filepath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws);
  }

  async exportContactsToExcel(contacts: any[]) {
    const data = contacts.map(c => ({
      Name: c.name,
      Email: c.email,
      Phone: c.phone,
      Company: c.company,
      Status: c.status
    }));
    this.exportToExcel(data, 'contacts.xlsx');
  }
}
