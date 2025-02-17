try {
    document.getElementById("upload").addEventListener("change", function (event) {
        const file = event.target.files[0]; // Tanlangan faylni olamiz

        if (file) {
            const reader = new FileReader(); // FileReader obyektini yaratamiz

            reader.onload = function (e) {
                const preview = document.getElementById("uploadedAvatar");
                preview.src = e.target.result; // Rasm ma'lumotlarini src ga yuklaymiz
                preview.style.display = "block"; // Rasmni ko‘rinadigan qilamiz
            };

            reader.readAsDataURL(file); // Faylni base64 formatida o‘qish
        }
    });
} catch (error) {
    console.error(error);
}
try {
    document.getElementById("formAccountSettings").querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener('change', function (event) {
            const file = event.target.files[0]; // Tanlangan faylni olamiz
            if (file) {
                const fileType = file.type; // Fayl turini aniqlash
                if (fileType !== "application/pdf") {
                    alert("Faqat PDF formatdagi fayllarni yuklashingiz mumkin!");
                    event.target.value = ""; // Faylni reset qilish
                }
            }
        });
    });
    document.getElementById("formAccountSettings").onsubmit = async function (event) {
        event.preventDefault(); // Formani qayta yuklashni to'xtatish

        const formData = new FormData(); // FormData obyektini yaratamiz

        // Text inputlar
        if (document.getElementById("firstName")) {
            formData.append("firstName", document.getElementById("firstName").value);
        }
        if (document.getElementById("lastName")) {
            formData.append("lastName", document.getElementById("lastName").value);
        }

        // Select element
        if (document.getElementById("defaultSelect")) {
            formData.append("direction", document.getElementById("defaultSelect").value);
        }

        // File inputlar
        if (document.getElementById("upload")) {
            const avatarFile = document.getElementById("upload").files[0];
            formData.append("avatar", avatarFile); // Suratingiz
        }
        if (document.getElementById("passportFile")) {
            const passportFile = document.getElementById("passportFile").files[0];
            formData.append("passport", passportFile); // Pasport fayli
        }
        if (document.getElementById("passportFile")) {
            const diplomaFile = document.getElementById("diplomaFile").files[0];
            formData.append("diplom", diplomaFile); // Pasport fayli
        }
        if (document.getElementById("attachmentFile")) {
            const attachmentFile = document.getElementById("attachmentFile").files[0];
            formData.append("ilova", attachmentFile); // Pasport fayli
        }



        try {
            // Fetch API orqali ma'lumotlarni jo'natish
            const response = await fetch("/profil/save", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                alert("Ma'lumotlar muvaffaqiyatli saqlandi!");
                window.location = "/profil";
            } else {
                alert("Xatolik yuz berdi. Qaytadan urinib ko'ring.");
            }
        } catch (error) {
            console.error("Xatolik:", error);
            alert("Tarmoqqa ulanishda xatolik yuz berdi.");
        }
    };
} catch (error) {
    console.error(error);
}


function downloadFile(fileUrl) {
    const a = document.createElement('a'); // <a> elementi yaratish
    a.href = fileUrl; // Fayl URL manzili
    a.download = ''; // Yuklab olishni boshlash uchun download atributi
    document.body.appendChild(a); // Havolani hujjatga qo'shish
    a.click(); // Yuklab olishni boshlash
    document.body.removeChild(a); // Havolani o'chirish
}