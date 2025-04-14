const sign_in_btn = document.querySelector("#sign-in-btn");
const sign_up_btn = document.querySelector("#sign-up-btn");
const container = document.querySelector(".container");
const codeModal = document.getElementById('codeModal');
let currentEmail = ''; // Для хранения email текущего пользователя

// Переключение между формами
sign_up_btn.addEventListener("click", () => {
  container.classList.add("sign-up-mode");
});

sign_in_btn.addEventListener("click", () => {
  container.classList.remove("sign-up-mode");
});

// Обработка формы Sign In
const signInForm = document.querySelector('.sign-in-form');
signInForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = signInForm.querySelector('input[placeholder="Username"]').value;
  const password = signInForm.querySelector('input[type="password"]').value;

  try {
    const response = await fetch('http://127.0.0.1:3000/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    });

    const data = await response.json();
    if (response.ok) {
      alert('Login successful! User ID: ' + data.user_id);
      // Перенаправление на страницу чата (можно добавить позже)
      // window.location.href = '/static/chat.html';
    } else {
      alert('Error: ' + (data.detail || 'Unknown error during login'));
    }
  } catch (error) {
    console.error('Error during login:', error);
    alert('Failed to connect to the server. Please ensure the server is running on port 3000.');
  }
});

// Обработка формы Sign Up
const signUpForm = document.querySelector('.sign-up-form');
signUpForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = signUpForm.querySelector('input[placeholder="Username"]').value;
  const email = signUpForm.querySelector('input[type="email"]').value;
  const password = signUpForm.querySelector('input[type="password"]').value;

  try {
    const response = await fetch('http://127.0.0.1:3000/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    if (response.ok) {
      currentEmail = email; // Сохраняем email для верификации
      codeModal.style.display = 'flex'; // Показываем модальное окно
    } else {
      alert('Error: ' + (data.detail || 'Unknown error during registration'));
    }
  } catch (error) {
    console.error('Error during registration:', error);
    alert('Failed to connect to the server. Please ensure the server is running on port 3000.');
  }
});

// Функция для проверки кода
async function verifyCode() {
  const code = document.getElementById('verificationCode').value;

  try {
    const response = await fetch('http://127.0.0.1:3000/verify-code/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentEmail, code }),
    });

    const data = await response.json();
    if (response.ok) {
      alert(data.message); // "Вы успешно зарегистрировались"
      codeModal.style.display = 'none'; // Скрываем модальное окно
      container.classList.remove('sign-up-mode'); // Переключаем на Sign In
    } else {
      alert('Error: ' + (data.detail || 'Unknown error during code verification'));
    }
  } catch (error) {
    console.error('Error during code verification:', error);
    alert('Failed to connect to the server. Please ensure the server is running on port 3000.');
  }
}