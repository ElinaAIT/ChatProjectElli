document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const contactsList = document.getElementById('contactsList');
    const groupsList = document.getElementById('groupsList');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebarMenu = document.querySelector('.sidebar-menu');
    const emojiButton = document.querySelector('.emoji-button');
    const emojiPanel = document.getElementById('emojiPanel');
    const contactsTab = document.getElementById('contactsTab');
    const groupsTab = document.getElementById('groupsTab');
    const settingsTab = document.querySelector('.settings-tab');
    const settingsMenu = document.getElementById('settingsMenu');
    const settingsMain = settingsMenu.querySelector('.settings-main');
    const settingsProfile = settingsMenu.querySelector('.settings-profile');

    // Хранилища сообщений
    const messagesByContact = {};
    const messagesByGroup = {};

    // Текущий режим (contacts или groups)
    let currentMode = 'contacts';
    let currentContact = 'Mom';
    let currentGroup = 'AIT-CS';

    // Переключение бокового меню
    menuToggle.addEventListener('click', () => {
        sidebarMenu.classList.toggle('active');
    });

    // Показ/скрытие меню настроек
    settingsTab.addEventListener('click', (e) => {
        e.stopPropagation(); // Предотвращаем закрытие при клике на иконку
        if (settingsMenu.classList.contains('active')) {
            settingsMenu.classList.remove('active');
            settingsTab.classList.remove('active');
            // Возвращаем основное меню при закрытии
            settingsMain.classList.add('active');
            settingsProfile.classList.remove('active');
        } else {
            // Позиционируем меню рядом с иконкой
            const rect = settingsTab.getBoundingClientRect();
            settingsMenu.style.top = `${rect.bottom + window.scrollY + 5}px`; // Чуть ниже иконки
            settingsMenu.style.left = `${rect.left + window.scrollX}px`; // Выравниваем по левому краю
            settingsMenu.classList.add('active');
            settingsTab.classList.add('active');
            closeAllMenus(); // Закрываем другие меню, если открыты
        }
    });

    // Закрытие меню настроек при клике вне его
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.settings-tab') && !e.target.closest('.settings-menu')) {
            settingsMenu.classList.remove('active');
            settingsTab.classList.remove('active');
            // Возвращаем основное меню при закрытии
            settingsMain.classList.add('active');
            settingsProfile.classList.remove('active');
        }
    });

    // Обработка кликов по пунктам меню настроек
    settingsMain.addEventListener('click', (e) => {
        const settingsItem = e.target.closest('.settings-item');
        if (settingsItem) {
            const action = settingsItem.getAttribute('data-action');
            if (action === 'my-profile') {
                settingsMain.classList.remove('active');
                settingsProfile.classList.add('active');
            }
            // Другие действия (create-group, exit) можно добавить здесь
        }
    });

    // Кнопка "назад" в профиле
    settingsProfile.addEventListener('click', (e) => {
        const backButton = e.target.closest('.back-button');
        if (backButton) {
            settingsProfile.classList.remove('active');
            settingsMain.classList.add('active');
        }
    });

    // Переключение на чат контактов
    contactsTab.addEventListener('click', () => {
        currentMode = 'contacts';
        contactsList.classList.add('active');
        groupsList.classList.remove('active');
        contactsTab.classList.add('active');
        groupsTab.classList.remove('active');
        settingsMenu.classList.remove('active');
        settingsTab.classList.remove('active');
        settingsMain.classList.add('active');
        settingsProfile.classList.remove('active');
        loadChat(currentContact, messagesByContact);
    });

    // Переключение на чат групп
    groupsTab.addEventListener('click', () => {
        currentMode = 'groups';
        groupsList.classList.add('active');
        contactsList.classList.remove('active');
        groupsTab.classList.add('active');
        contactsTab.classList.remove('active');
        settingsMenu.classList.remove('active');
        settingsTab.classList.remove('active');
        settingsMain.classList.add('active');
        settingsProfile.classList.remove('active');
        loadChat(currentGroup, messagesByGroup);
    });

    // Показ/скрытие панели эмодзи
    emojiButton.addEventListener('click', () => {
        if (emojiPanel.classList.contains('active')) {
            emojiPanel.style.opacity = '0';
            setTimeout(() => {
                emojiPanel.classList.remove('active');
            }, 200);
        } else {
            emojiPanel.classList.add('active');
            emojiPanel.style.opacity = '1';
        }
    });

    // Добавление эмодзи в поле ввода
    emojiPanel.addEventListener('click', (e) => {
        const emoji = e.target.closest('.emoji');
        if (emoji) {
            messageInput.value += emoji.dataset.emoji;
            messageInput.focus();
            // Панель эмодзи НЕ закрывается при выборе эмодзи
        }
    });

    // Закрытие панели эмодзи при клике вне её
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.emoji-panel') && !e.target.closest('.emoji-button')) {
            if (emojiPanel.classList.contains('active')) {
                emojiPanel.style.opacity = '0';
                setTimeout(() => {
                    emojiPanel.classList.remove('active');
                }, 200);
            }
        }
    });

    // Поиск
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        if (currentMode === 'contacts') {
            const contacts = contactsList.getElementsByClassName('contact');
            Array.from(contacts).forEach(contact => {
                const name = contact.querySelector('.name').textContent.toLowerCase();
                contact.style.display = name.includes(searchTerm) ? 'flex' : 'none';
            });
        } else {
            const groups = groupsList.getElementsByClassName('group');
            Array.from(groups).forEach(group => {
                const name = group.querySelector('.name').textContent.toLowerCase();
                group.style.display = name.includes(searchTerm) ? 'flex' : 'none';
            });
        }
    });

    // Переключение чатов (контакты)
    contactsList.addEventListener('click', (e) => {
        if (currentMode !== 'contacts') return;
        const contact = e.target.closest('.contact');
        if (contact) {
            Array.from(contactsList.getElementsByClassName('contact')).forEach(c =>
                c.classList.remove('active'));
            contact.classList.add('active');
            currentContact = contact.querySelector('.name').textContent;
            loadChat(currentContact, messagesByContact);
        }
    });

    // Переключение чатов (группы)
    groupsList.addEventListener('click', (e) => {
        if (currentMode !== 'groups') return;
        const group = e.target.closest('.group');
        if (group) {
            Array.from(groupsList.getElementsByClassName('group')).forEach(g =>
                g.classList.remove('active'));
            group.classList.add('active');
            currentGroup = group.querySelector('.name').textContent;
            loadChat(currentGroup, messagesByGroup);
        }
    });

    // Загрузка чата
    function loadChat(name, messagesStorage) {
        document.querySelector('.chat-header .name').textContent = name;
        document.querySelector('.chat-header .status').textContent =
            currentMode === 'contacts' && contactsList.querySelector(`.contact.active .status.online`) ? 'онлайн' : '';

        chatMessages.innerHTML = '';
        if (messagesStorage[name]) {
            messagesStorage[name].forEach(message => {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message sent';
                messageDiv.innerHTML = `
                    <div class="message-content">
                        <span class="message-text">${message.text}</span>
                        <span class="message-time">${message.time}</span>
                        <span class="message-status ${message.status}"><i class="fas fa-${message.status === 'read' ? 'check-double' : 'check'}"></i></span>
                        <span class="message-actions">
                            <i class="fas fa-ellipsis-v"></i>
                            <div class="message-menu">
                                <div class="menu-item">Редактировать</div>
                                <div class="menu-item">Удалить</div>
                                <div class="menu-item">Отменить отправку</div>
                            </div>
                        </span>
                    </div>
                `;
                chatMessages.appendChild(messageDiv);
            });
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Отправка сообщения
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const messagesStorage = currentMode === 'contacts' ? messagesByContact : messagesByGroup;
        const currentTarget = currentMode === 'contacts' ? currentContact : currentGroup;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message sent';
        messageDiv.innerHTML = `
            <div class="message-content">
                <span class="message-text">${text}</span>
                <span class="message-time">${time}</span>
                <span class="message-status unread"><i class="fas fa-check"></i></span>
                <span class="message-actions">
                    <i class="fas fa-ellipsis-v"></i>
                    <div class="message-menu">
                        <div class="menu-item">Редактировать</div>
                        <div class="menu-item">Удалить</div>
                        <div class="menu-item">Отменить отправку</div>
                    </div>
                </span>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        messageInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (!messagesStorage[currentTarget]) {
            messagesStorage[currentTarget] = [];
        }
        messagesStorage[currentTarget].push({
            text: text,
            time: time,
            status: 'unread'
        });

        setTimeout(() => {
            const status = messageDiv.querySelector('.message-status');
            status.className = 'message-status read';
            status.innerHTML = '<i class="fas fa-check-double"></i>';

            const messageIndex = messagesStorage[currentTarget].length - 1;
            messagesStorage[currentTarget][messageIndex].status = 'read';
        }, 2000);
    }

    // Закрытие всех открытых меню
    function closeAllMenus() {
        const menus = document.querySelectorAll('.message-menu.active');
        menus.forEach(menu => menu.classList.remove('active'));
    }

    // Открытие/закрытие меню при клике на иконку
    chatMessages.addEventListener('click', (e) => {
        const actionsIcon = e.target.closest('.message-actions i');
        if (actionsIcon) {
            const menu = actionsIcon.nextElementSibling;
            const isOpen = menu.classList.contains('active');
            closeAllMenus();
            if (!isOpen) {
                menu.classList.add('active');
            }
        }
    });

    // Закрытие меню при клике вне его
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.message-actions') && !e.target.closest('.message-menu')) {
            closeAllMenus();
        }
    });

    // Обработка действий с сообщением
    chatMessages.addEventListener('click', (e) => {
        const menuItem = e.target.closest('.menu-item');
        if (!menuItem) return;

        const message = menuItem.closest('.message');
        const messageContent = message.querySelector('.message-content');
        const messageText = message.querySelector('.message-text');
        const messagesStorage = currentMode === 'contacts' ? messagesByContact : messagesByGroup;
        const currentTarget = currentMode === 'contacts' ? currentContact : currentGroup;

        const messageIndex = Array.from(chatMessages.children).indexOf(message);
        closeAllMenus();

        if (menuItem.textContent === 'Редактировать') {
            const originalText = messageText.textContent;
            messageContent.innerHTML = `
                <div class="edit-container">
                    <input type="text" class="edit-input" value="${originalText}">
                    <div class="edit-actions">
                        <button class="save-btn"><i class="fas fa-check"></i> Сохранить</button>
                        <button class="delete-btn"><i class="fas fa-trash"></i> Удалить</button>
                        <button class="cancel-btn"><i class="fas fa-times"></i> Отменить</button>
                    </div>
                </div>
            `;

            const editInput = messageContent.querySelector('.edit-input');
            editInput.focus();

            messageContent.querySelector('.save-btn').addEventListener('click', () => {
                const newText = editInput.value.trim();
                if (newText) {
                    messageContent.innerHTML = `
                        <span class="message-text">${newText}</span>
                        <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span class="message-status read"><i class="fas fa-check-double"></i></span>
                        <span class="message-actions">
                            <i class="fas fa-ellipsis-v"></i>
                            <div class="message-menu">
                                <div class="menu-item">Редактировать</div>
                                <div class="menu-item">Удалить</div>
                                <div class="menu-item">Отменить отправку</div>
                            </div>
                        </span>
                    `;
                    messagesStorage[currentTarget][messageIndex].text = newText;
                    messagesStorage[currentTarget][messageIndex].time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    messagesStorage[currentTarget][messageIndex].status = 'read';
                }
            });

            messageContent.querySelector('.delete-btn').addEventListener('click', () => {
                message.remove();
                messagesStorage[currentTarget].splice(messageIndex, 1);
            });

            messageContent.querySelector('.cancel-btn').addEventListener('click', () => {
                messageContent.innerHTML = `
                    <span class="message-text">${originalText}</span>
                    <span class="message-time">${messagesStorage[currentTarget][messageIndex].time}</span>
                    <span class="message-status ${messagesStorage[currentTarget][messageIndex].status}"><i class="fas fa-${messagesStorage[currentTarget][messageIndex].status === 'read' ? 'check-double' : 'check'}"></i></span>
                    <span class="message-actions">
                        <i class="fas fa-ellipsis-v"></i>
                        <div class="message-menu">
                            <div class="menu-item">Редактировать</div>
                            <div class="menu-item">Удалить</div>
                            <div class="menu-item">Отменить отправку</div>
                        </span>
                    </span>
                `;
            });

        } else if (menuItem.textContent === 'Удалить') {
            message.remove();
            messagesStorage[currentTarget].splice(messageIndex, 1);
        } else if (menuItem.textContent === 'Отменить отправку') {
            message.remove();
            messagesStorage[currentTarget].splice(messageIndex, 1);
        }
    });
});