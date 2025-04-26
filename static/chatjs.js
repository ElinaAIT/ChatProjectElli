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
    const createGroupChatButton = document.getElementById('createGroupChatButton');
    const groupModal = document.getElementById('groupModal');
    const groupNameInput = document.getElementById('groupNameInput');
    const groupContactsList = document.getElementById('groupContactsList');
    const createGroupFinal = document.getElementById('createGroupFinal');

    const messagesByContact = {};
    const messagesByGroup = {};
    let currentMode = 'contacts';
    let currentContact = 'Mom';
    let currentGroup = 'AIT-CS';

    function escapeHTML(str) {
        return str.replace(/[&<>"']/g, match => ({
            '&': '&',
            '<': '<',
            '>': '>',
            '"': '"',
            "'": '\''
        }[match]));
    }

    function loadContactsForGroup() {
        fetch('/api/users')
            .then(response => response.json())
            .then(data => {
                groupContactsList.innerHTML = '';
                if (data.users) {
                    data.users.forEach(user => {
                        const contactDiv = document.createElement('div');
                        contactDiv.className = 'contact';
                        contactDiv.innerHTML = `
                            <input type="checkbox" class="contact-checkbox" data-username="${user}">
                            <div class="avatar"></div>
                            <span class="name">${user}</span>
                        `;
                        groupContactsList.appendChild(contactDiv);
                    });
                }
            })
            .catch(error => console.error('Error loading users for group:', error));
    }

    function openGroupModal() {
        groupModal.style.display = 'flex';
        groupNameInput.value = '';
        loadContactsForGroup();
    }

    function closeGroupModal() {
        groupModal.style.display = 'none';
    }

    function createGroup() {
        const groupName = groupNameInput.value.trim();
        const selectedUsers = Array.from(groupContactsList.querySelectorAll('.contact-checkbox:checked'))
            .map(checkbox => checkbox.dataset.username);

        if (!groupName) {
            alert('Введите название группы');
            return;
        }
        if (selectedUsers.length === 0) {
            alert('Выберите хотя бы одного участника');
            return;
        }

        fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: groupName, members: selectedUsers })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    closeGroupModal();
                    loadGroups();
                } else {
                    alert('Не удалось создать группу');
                }
            })
            .catch(error => {
                console.error('Error creating group:', error);
                alert('Ошибка при создании группы');
            });
    }

    createGroupFinal.addEventListener('click', createGroup);
    groupModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-close')) {
            closeGroupModal();
        }
    });

    menuToggle.addEventListener('click', () => {
        sidebarMenu.classList.toggle('active');
        document.querySelector('.menu-items').classList.toggle('active');
    });

    settingsTab.addEventListener('click', (e) => {
        e.stopPropagation();
        if (settingsMenu.classList.contains('active')) {
            settingsMenu.classList.remove('active');
            settingsTab.classList.remove('active');
            settingsMain.classList.add('active');
            settingsProfile.classList.remove('active');
        } else {
            const rect = settingsTab.getBoundingClientRect();
            settingsMenu.style.top = `${rect.bottom + window.scrollY + 5}px`;
            settingsMenu.style.left = `${rect.left + window.scrollX}px`;
            settingsMenu.classList.add('active');
            settingsTab.classList.add('active');
            closeAllMenus();
        }
    });

    settingsMain.addEventListener('click', (e) => {
        const settingsItem = e.target.closest('.settings-item');
        if (settingsItem) {
            const action = settingsItem.getAttribute('data-action');
            if (action === 'my-profile') {
                settingsMain.classList.remove('active');
                settingsProfile.classList.add('active');
            } else if (action === 'create-group') {
                openGroupModal();
                settingsMenu.classList.remove('active');
                settingsTab.classList.remove('active');
            }
        }
    });

    settingsProfile.addEventListener('click', (e) => {
        const backButton = e.target.closest('.back-button');
        if (backButton) {
            settingsProfile.classList.remove('active');
            settingsMain.classList.add('active');
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.settings-tab') && !e.target.closest('.settings-menu')) {
            settingsMenu.classList.remove('active');
            settingsTab.classList.remove('active');
            settingsMain.classList.add('active');
            settingsProfile.classList.remove('active');
        }
    });

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

    emojiPanel.addEventListener('click', (e) => {
        const emoji = e.target.closest('.emoji');
        if (emoji) {
            messageInput.value += emoji.dataset.emoji;
            messageInput.focus();
        }
    });

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

    function loadChat(name, messagesStorage) {
        document.querySelector('.chat-header .name').textContent = name;
        const contactElement = currentMode === 'contacts' ?
            contactsList.querySelector(`.contact.active .status`) : null;
        document.querySelector('.chat-header .status').textContent =
            contactElement && contactElement.classList.contains('online') ? 'онлайн' : '';

        chatMessages.innerHTML = '';
        if (messagesStorage[name]) {
            messagesStorage[name].forEach(message => {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message sent';
                messageDiv.innerHTML = `
                    <div class="message-content">
                        <span class="message-text">${escapeHTML(message.text)}</span>
                        <span class="message-time">${message.time}</span>
                        <span class="message-status ${message.status}">
                            <i class="fas fa-${message.status === 'read' ? 'check-double' : 'check'}"></i>
                        </span>
                        <span class="message-actions">
                            <i class="fas fa-ellipsis-v"></i>
                            <div class="message-menu">
                                <div class="menu-item">
                                    <i class="fas fa-edit"></i> Редактировать
                                </div>
                                <div class="menu-item">
                                    <i class="fas fa-trash"></i> Удалить
                                </div>
                                <div class="menu-item">
                                    <i class="fas fa-undo"></i> Отменить отправку
                                </div>
                            </div>
                        </span>
                    </div>
                `;
                chatMessages.appendChild(messageDiv);
            });
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

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
                <span class="message-text">${escapeHTML(text)}</span>
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

    function closeAllMenus() {
        const menus = document.querySelectorAll('.message-menu.active');
        menus.forEach(menu => menu.classList.remove('active'));
    }

    // Обработчик для открытия меню действий сообщения
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

    // Закрытие меню при клике вне
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.message-actions') && !e.target.closest('.message-menu')) {
            closeAllMenus();
        }
    });

    // Обработчик для выбора действий из меню (Редактировать, Удалить, Отменить отправку)
    chatMessages.addEventListener('click', (e) => {
        const menuItem = e.target.closest('.menu-item');
        if (!menuItem) return;

        const message = menuItem.closest('.message');
        const messageContent = message.querySelector('.message-content');
        const messageText = message.querySelector('.message-text');
        const messagesStorage = currentMode === 'contacts' ? messagesByContact : messagesByGroup;
        const currentTarget = currentMode === 'contacts' ? currentContact : currentGroup;

        const messageIndex = Array.from(chatMessages.children).indexOf(message);
        if (messageIndex === -1) {
            console.error('Message not found in chatMessages.children');
            return;
        }

        closeAllMenus();

        if (menuItem.textContent.includes('Редактировать')) {
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
        } else if (menuItem.textContent.includes('Удалить')) {
            message.remove();
            messagesStorage[currentTarget].splice(messageIndex, 1);
        } else if (menuItem.textContent.includes('Отменить отправку')) {
            message.remove();
            messagesStorage[currentTarget].splice(messageIndex, 1);
        }
    });

    // Отдельный обработчик для кнопок редактирования (Сохранить, Удалить, Отменить)
    chatMessages.addEventListener('click', (e) => {
        // Обработчик для кнопки "Сохранить"
        const saveButton = e.target.closest('.save-btn');
        if (saveButton) {
            console.log('Save button clicked!');
            const message = saveButton.closest('.message');
            const messageContent = message.querySelector('.message-content');
            const editInput = messageContent.querySelector('.edit-input');
            const messagesStorage = currentMode === 'contacts' ? messagesByContact : messagesByGroup;
            const currentTarget = currentMode === 'contacts' ? currentContact : currentGroup;
            const messageIndex = Array.from(chatMessages.children).indexOf(message);

            if (messageIndex === -1) {
                console.error('Message not found in chatMessages.children during save');
                return;
            }

            const newText = editInput.value.trim();
            console.log('New text:', newText);
            if (newText) {
                if (!messagesStorage || !messagesStorage[currentTarget]) {
                    console.error('messagesStorage or currentTarget is undefined:', { messagesStorage, currentTarget });
                    return;
                }
                messageContent.innerHTML = `
                    <span class="message-text">${escapeHTML(newText)}</span>
                    <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span class="message-status read"><i class="fas fa-check-double"></i></span>
                    <span class="message-actions">
                        <i class="fas fa-ellipsis-v"></i>
                        <div class="message-menu">
                            <div class="menu-item">
                                <i class="fas fa-edit"></i> Редактировать
                            </div>
                            <div class="menu-item">
                                <i class="fas fa-trash"></i> Удалить
                            </div>
                            <div class="menu-item">
                                <i class="fas fa-undo"></i> Отменить отправку
                            </div>
                        </div>
                    </span>
                `;
                messagesStorage[currentTarget][messageIndex].text = newText;
                messagesStorage[currentTarget][messageIndex].time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                messagesStorage[currentTarget][messageIndex].status = 'read';
            } else {
                console.log('Text is empty, save aborted.');
                alert('Пожалуйста, введите текст сообщения.');
            }
            return;
        }

        // Обработчик для кнопки "Удалить" в режиме редактирования
        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            console.log('Delete button clicked!');
            const message = deleteButton.closest('.message');
            const messagesStorage = currentMode === 'contacts' ? messagesByContact : messagesByGroup;
            const currentTarget = currentMode === 'contacts' ? currentContact : currentGroup;
            const messageIndex = Array.from(chatMessages.children).indexOf(message);

            if (messageIndex === -1) {
                console.error('Message not found in chatMessages.children during delete');
                return;
            }

            message.remove();
            messagesStorage[currentTarget].splice(messageIndex, 1);
            return;
        }

        // Обработчик для кнопки "Отменить"
        const cancelButton = e.target.closest('.cancel-btn');
        if (cancelButton) {
            console.log('Cancel button clicked!');
            const message = cancelButton.closest('.message');
            const messageContent = message.querySelector('.message-content');
            const messagesStorage = currentMode === 'contacts' ? messagesByContact : messagesByGroup;
            const currentTarget = currentMode === 'contacts' ? currentContact : currentGroup;
            const messageIndex = Array.from(chatMessages.children).indexOf(message);

            if (messageIndex === -1) {
                console.error('Message not found in chatMessages.children during cancel');
                return;
            }

            messageContent.innerHTML = `
                <span class="message-text">${escapeHTML(messagesStorage[currentTarget][messageIndex].text)}</span>
                <span class="message-time">${messagesStorage[currentTarget][messageIndex].time}</span>
                <span class="message-status ${messagesStorage[currentTarget][messageIndex].status}"><i class="fas fa-${messagesStorage[currentTarget][messageIndex].status === 'read' ? 'check-double' : 'check'}"></i></span>
                <span class="message-actions">
                    <i class="fas fa-ellipsis-v"></i>
                    <div class="message-menu">
                        <div class="menu-item">
                            <i class="fas fa-edit"></i> Редактировать
                        </div>
                        <div class="menu-item">
                            <i class="fas fa-trash"></i> Удалить
                        </div>
                        <div class="menu-item">
                            <i class="fas fa-undo"></i> Отменить отправку
                        </div>
                    </div>
                </span>
            `;
            return;
        }
    });

    function loadGroups() {
        fetch('/api/groups')
            .then(response => response.json())
            .then(data => {
                groupsList.innerHTML = '';
                if (data.groups) {
                    data.groups.forEach(group => {
                        const groupDiv = document.createElement('div');
                        groupDiv.className = 'group';
                        groupDiv.innerHTML = `
                            <div class="avatar"></div>
                            <span class="name">${escapeHTML(group.name)}</span>
                        `;
                        groupsList.appendChild(groupDiv);
                    });
                }
            })
            .catch(error => console.error('Error loading groups:', error));
    }

    // Change the color of all icons to rgb(255, 255, 255)
    const icons = document.querySelectorAll('.menu-item i, .settings-tab i, .message-actions i, .message-status i');
    icons.forEach(icon => {
        icon.style.color = '#FFFFFF';
    });
});