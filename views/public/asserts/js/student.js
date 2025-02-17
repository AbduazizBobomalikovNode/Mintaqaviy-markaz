function downloadFile(fileUrl) {
    const a = document.createElement('a'); // <a> elementi yaratish
    a.href = fileUrl; // Fayl URL manzili
    a.download = ''; // Yuklab olishni boshlash uchun download atributi
    document.body.appendChild(a); // Havolani hujjatga qo'shish
    a.click(); // Yuklab olishni boshlash
    document.body.removeChild(a); // Havolani o'chirish
}