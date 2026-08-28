import request from "@/utils/request";

export default async function saveFileWithAxios(path: string, fileName: string, params?: any) {
  try {
    const response = await request.get(path, params, { responseType: 'blob' });
    
    // const disposition = response.headers['content-disposition'];
    // if (disposition) {
    //   const match = disposition.match(/filename="?([^"]+)"?/);
    //   if (match) fileName = decodeURIComponent(match[1]);
    // }
    //@ts-ignore
    const url = URL.createObjectURL(new Blob([response]));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Save failed:', err);
  }
}