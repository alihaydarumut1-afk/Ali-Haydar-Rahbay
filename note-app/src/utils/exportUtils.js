export const handleExportWord = (elementId, fileName = 'document') => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Word (.doc) için özel HTML şablonu (Karanlık modu ezer, her zaman beyaz çıktı verir)
  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #ffffff; color: #111827; line-height: 1.8; padding: 20px; }
        h1, h2, h3 { color: #111827; font-weight: bold; }
        p { margin-bottom: 1em; }
        .no-print { display: none !important; }
      </style>
    </head>
    <body>
      ${element.innerHTML}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const handleExportPDF = async (elementId, fileName = 'document') => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // html2pdf kütüphanesini dinamik olarak yükle (npm install gerektirmez, bundle boyutunu şişirmez)
  if (!window.html2pdf) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Karanlık modu atlamak için html2pdf'e özel config ayarı
  const opt = {
    margin: 15,
    filename: `${fileName}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', ignoreElements: (el) => el.classList.contains('no-print') },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // Orijinal elementin renklerini etkilemeden sadece render motoruna beyaz arkaplan komutu verir
  await window.html2pdf().set(opt).from(element).save();
};