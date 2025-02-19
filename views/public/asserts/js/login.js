function showAlertWithTimeout(message, timeout = 1000) {
    // Alertni ko'rsatish
    const alertBox = window.alert(message);

    // Vaqtni boshlash, agar foydalanuvchi 5 soniya ichida alertni bosmasa
    const timeoutId = setTimeout(() => {
        console.log("Alert bekor qilindi: Vaqt o'tdi");
        alertBox
        // Alertni avtomatik tarzda bekor qilish uchun kod
        // Alertni bekor qilish uchun boshqa biron narsa qilish kerak
        // Chunki JavaScriptda alert() oynasini to'xtatish yoki yopish imkoniyati yo'q
    }, timeout);

    // Foydalanuvchi alertni bosganda timeoutni to'xtatish
    window.alert = function() {
        clearTimeout(timeoutId); // Timeoutni bekor qilish
        return alertBox;
    };
}


// use this simple function to automatically focus on the next input
function focusNextInput(el, prevId, nextId) {
    if (el.value.length === 0) {
        if (prevId) {
            document.getElementById(prevId).focus();
        }
    } else {
        if (nextId) {
            document.getElementById(nextId).focus();
        }
    }
}

document.querySelectorAll('[data-focus-input-init]').forEach(function (element) {
    element.addEventListener('keyup', function () {
        const prevId = this.getAttribute('data-focus-input-prev');
        const nextId = this.getAttribute('data-focus-input-next');
        focusNextInput(this, prevId, nextId);
    });

    // Handle paste event to split the pasted code into each input
    element.addEventListener('paste', function (event) {
        event.preventDefault();
        const pasteData = (event.clipboardData || window.clipboardData).getData('text');
        const digits = pasteData.replace(/\D/g, ''); // Only take numbers from the pasted data

        // Get all input fields
        const inputs = document.querySelectorAll('[data-focus-input-init]');

        // Iterate over the inputs and assign values from the pasted string
        inputs.forEach((input, index) => {
            if (digits[index]) {
                input.value = digits[index];
                // Focus the next input after filling the current one
                const nextId = input.getAttribute('data-focus-input-next');
                if (nextId) {
                    document.getElementById(nextId).focus();
                }
            }
        });
    });
});

console.log("hello world!")
document.getElementById("phone-input").oninput = function (e) {
    let input = e.target.value.replace(/\D/g, ""); // Faqat raqamlarni qoldirish
    let formatted = "";

    if (input.length > 0) {
        formatted = input.substring(0, 2); // Birinchi 2 raqam
    }
    if (input.length > 2) {
        formatted += " " + input.substring(2, 5); // Keyingi 3 raqam
    }
    if (input.length > 5) {
        formatted += "-" + input.substring(5, 7); // Keyingi 2 raqam
    }
    if (input.length > 7) {
        formatted += "-" + input.substring(7, 9); // So‘nggi 2 raqam
    }

    e.target.value = formatted; // To'g'irlangan qiymatni o'rnatish
};
var counter = 120;



function startInterval() {
    const interval = setInterval(() => {
        document.getElementById("counter").innerText = counter;
        counter--;
        if (counter === 0) {
            counter = 120; // Counterni 120 ga qaytarish
            flag = false;
            code.classList.add("hidden");
            sendAndCheckBtn.innerText = "Qayta yuborish";
            clearInterval(interval); // Intervalni to'xtatish
        }
    }, 1000);
}

// DOM elementlarni olish
let flag = false;
const phone = document.getElementById("phone-input");
const code = document.getElementById("kod");
const sendAndCheckBtn = document.getElementById("btnsend");
// const resendBtn = document.getElementById("resend");

// Elementlar mavjudligini tekshirish
if (!phone || !code || !sendAndCheckBtn) {
    console.error("Kerakli elementlardan biri topilmadi.");
} else {
    console.log("Barcha elementlar muvaffaqiyatli topildi.");
}

// Tekshiruv sonini kuzatish uchun counter
let checkAttempts = 0;

// Inputlarni boshlang‘ich holatiga qaytarish uchun funktsiya
function resetInputs() {
    flag = false;
    checkAttempts = 0;

    // Telefon va kod inputlarini tozalash
    phone.value = "";
    code.querySelectorAll("input").forEach(input => {
        input.value = "";
    });

    // Tugma matnini o'zgartirish va kod inputni yashirish
    sendAndCheckBtn.innerText = "Kod yuborish";
    code.classList.add("hidden");
}

sendAndCheckBtn.addEventListener("click", () => {
    if (flag) {
        const phoneNumber = "+998" + phone.value.replace(/\s|-/g, "");
        const enteredCode = Array.from(code.querySelectorAll("input"))
            .map(input => input.value.trim())
            .join("");

        if (phoneNumber === "") {
            showAlertWithTimeout("Telefon raqamini kiriting!");
            return;
        }

        if (enteredCode.length !== 6) {
            showAlertWithTimeout("6 xonali kodni to‘liq kiriting!");
            return;
        }

        // Serverga so'rov jo‘natish
        fetch(`/auth/checked`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: phoneNumber, code: enteredCode }),
        })
            .then(response => response.json())
            .then(data => {//
                if (data.success) {
                    showAlertWithTimeout("Kod muvaffaqiyatli tasdiqlandi!");
                    resetInputs(); // Muvaffaqiyatli tasdiqdan keyin boshlang‘ich holatga qaytarish
                    if (data.nazoratchi) {
                        window.location = "/student";
                    }else  window.location = "/profil";
                    if (data.admin) {
                        window.location = "/profil";
                    }
                } else {
                    showAlertWithTimeout("Kod noto‘g‘ri yoki muddati o‘tgan.");
                    checkAttempts++;

                    // Agar 5 ta urinishdan oshsa, inputlarni reset qilish
                    if (checkAttempts >= 5) {
                        showAlertWithTimeout("Maksimal urinish soniga yetdingiz. Yangi kod oling.");
                        resetInputs();
                    }
                }
            })
            .catch(err => {
                console.error("Xato yuz berdi:", err);
                showAlertWithTimeout("Server bilan bog‘lanishda xato yuz berdi.");
            });
    } else {
        const phoneNumber = phone.value.replace(/\s|-/g, "");

        const phone_ = "+998" + phoneNumber; // Telefon raqam
        const url = `/auth/sms/${phone_}`; // API marshruti
        code.classList.remove("hidden");

        fetch(url)
            .then(response => response.json()) // Javobni JSON formatida olish
            .then(data => {
                if (data.success) {
                    flag = true;
                    sendAndCheckBtn.innerText = "Tasdiqlash";
                    startInterval();

                    console.log(data.message); // SMS yuborish muvaffaqiyati haqida xabar
                } else {
                    showAlertWithTimeout("Qandaydir xatolik qaytatdan harakat qilib ko'ring!");
                    console.error("Xatolik:", data.message); // Xatolik xabari
                }
            })
            .catch(err => {
                showAlertWithTimeout("Qandaydir xatolik qaytatdan harakat qilib ko'ring!");
                console.error("So‘rov yuborishda xato yuz berdi:", err); // Ichki server yoki tarmoq xatosi
            });
    }
});


// Qayta kod yuborish tugmasiga hodisani biriktirish
// resendBtn.addEventListener("click", () => {
//     const phoneNumber = phone.value.replace(/\s|-/g, "");

//     if (phoneNumber === "") {
//         alert("Telefon raqamini kiriting!");
//         return;
//     }

//     const phone = "+998" + phoneNumber; // Telefon raqam
//     const url = `/auth/sms/${phone}`; // API marshruti

//     // Serverga so'rov yuborish
//     fetch(url)
//         .then(response => response.json()) // Javobni JSON formatida olish
//         .then(data => {
//             if (data.success) {
//                 flag = true;
//                 checkAttempts = 0; // Urinish sonini qayta o'rnatish
//                 sendAndCheckBtn.innerText = "Tasdiqlash";
//                 counter = 120; // Vaqtni qayta boshlash uchun

//                 // Kodni tekshirish inputlarini tozalash
//                 code.querySelectorAll("input").forEach(input => {
//                     input.value = "";
//                 });

//                 console.log("Kod qayta yuborildi:", data.message); // Logda muvaffaqiyatli xabar
//             } else {
//                 alert("Kod yuborishda xato yuz berdi. Qaytadan urinib ko‘ring.");
//                 console.error("Xatolik:", data.message); // Xatolik haqida ma'lumot
//             }
//         })
//         .catch(err => {
//             alert("Server bilan bog‘lanishda xato yuz berdi.");
//             console.error("So‘rov yuborishda xato yuz berdi:", err); // Ichki server yoki tarmoq xatosi
//         });
// });
