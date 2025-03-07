let savedCommands = [];

function createInputGroup() {
    const wrapper = document.createElement('div');
    wrapper.className = 'input-group';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'command-input';
    input.placeholder = '输入命令片段';
    
    const addButton = document.createElement('button');
    addButton.className = 'add-input-btn';
    addButton.innerHTML = '+';
    addButton.onclick = function() {
        const newGroup = createInputGroup();
        wrapper.parentNode.insertBefore(newGroup, wrapper.nextSibling);
    };
    
    wrapper.appendChild(input);
    wrapper.appendChild(addButton);
    return wrapper;
}

function addInput() {
    const container = document.getElementById('inputContainer');
    const newGroup = createInputGroup();
    container.insertBefore(newGroup, container.lastElementChild);
}

// 添加显示 toast 的函数
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// 修改 copyCommand 函数
function copyCommand() {
    const inputs = document.getElementsByClassName('command-input');
    const command = Array.from(inputs)
        .map(input => input.value.trim())
        .filter(value => value !== '')
        .join(' ');
    
    navigator.clipboard.writeText(command)
        .then(() => showToast('命令已复制到剪贴板'))
        .catch(err => showToast('复制失败：' + err));
}
// 修改 saveCommand 函数
function saveCommand() {
    const inputs = document.getElementsByClassName('command-input');
    const command = Array.from(inputs)
        .map(input => input.value.trim())
        .filter(value => value !== '')
        .join(' ');
    
    const name = document.getElementById('commandName').value.trim();
    const note = document.getElementById('commandNote').value.trim();
    
    if (!command || !name) {
        showToast('请输入命令和名称');
        return;
    }

    savedCommands.push({ name, command, note });
    updateSavedCommands();
    showToast('命令已保存');
}
// 添加删除命令的函数
function deleteCommand(index) {
    if (confirm('确定要删除这条命令吗？')) {
        savedCommands.splice(index, 1);
        updateSavedCommands();
        showToast('命令已删除');
    }
}

// 修改 updateSavedCommands 函数
function updateSavedCommands() {
    const container = document.getElementById('savedCommands');
    container.innerHTML = '';
    
    savedCommands.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'saved-command';
        div.innerHTML = `
            <div>
                <strong>${item.name}</strong>
                <p>${item.command}</p>
                ${item.note ? `<p class="command-note">${item.note}</p>` : ''}
            </div>
            <div class="command-buttons">
                <button onclick="editCommand(${index})">编辑</button>
                <button onclick="copySavedCommand(${index})">复制</button>
                <button class="delete-btn" onclick="deleteCommand(${index})">删除</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// 修改 editCommand 函数
function editCommand(index) {
    const commandData = savedCommands[index];
    
    // 清空现有输入框
    const container = document.getElementById('inputContainer');
    while (container.children.length > 1) {
        container.removeChild(container.firstChild);
    }
    
    // 将命令拆分并填充到输入框中
    const commandParts = commandData.command.split(' ');
    commandParts.forEach((part) => {
        const newGroup = createInputGroup();
        newGroup.querySelector('.command-input').value = part;
        container.insertBefore(newGroup, container.lastElementChild);
    });
    
    // 填充名称和备注
    document.getElementById('commandName').value = commandData.name;
    document.getElementById('commandNote').value = commandData.note || '';
    
    window.scrollTo(0, 0);
    showToast('命令已加载到编辑区');
}

// 修改 exportToCSV 函数
function exportToCSV() {
    const csv = savedCommands
        .map(item => `"${item.name}","${item.command}","${item.note || ''}"`)
        .join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'commands.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// 修改 importFromCSV 函数
function importFromCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n');
        savedCommands = rows
            .filter(row => row.trim())
            .map(row => {
                const [name, command, note] = row
                    .split(',')
                    .map(cell => cell.replace(/^"|"$/g, '').trim());
                return { name, command, note };
            });
        updateSavedCommands();
    };
    reader.readAsText(file);
}

// 初始化时添加一个输入框
window.onload = () => addInput();

// 添加AI配置相关函数
let aiConfig = {
    apiKey: '',
    apiHost: '',
    modelName: 'gpt-3.5-turbo'
};

function saveAIConfig() {
    aiConfig = {
        apiKey: document.getElementById('apiKey').value.trim(),
        apiHost: document.getElementById('apiHost').value.trim(),
        modelName: document.getElementById('modelName').value.trim() || 'gpt-3.5-turbo'
    };
    localStorage.setItem('aiConfig', JSON.stringify(aiConfig));
    showToast('配置已保存');
}

async function testAIConnection() {
    if (!aiConfig.apiKey || !aiConfig.apiHost) {
        showToast('请先填写API配置');
        return;
    }

    try {
        const response = await fetch(`${aiConfig.apiHost}models`, {
            headers: {
                'Authorization': `Bearer ${aiConfig.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast('连接成功');
        } else {
            showToast(`连接失败：${response.status}`);
        }
    } catch (error) {
        showToast(`连接错误：${error.message}`);
    }
}

async function generateCommand() {
    const prompt = document.getElementById('promptInput').value.trim();
    if (!prompt) {
        showToast('请输入提示词');
        return;
    }

    const output = document.getElementById('aiOutput');
    output.textContent = '生成中...';

    try {
        const response = await fetch(`${aiConfig.apiHost}chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${aiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: aiConfig.modelName,
                messages: [{
                    role: "user",
                    content: `请生成命令：${prompt}。只需返回命令本身，不要包含任何解释。`
                }]
            })
        });

        const data = await response.json();
        if (response.ok) {
            const command = data.choices[0].message.content;
            output.textContent = command;
            populateCommandInputs(command);
        } else {
            output.textContent = `错误：${data.error.message}`;
        }
    } catch (error) {
        output.textContent = `请求失败：${error.message}`;
    }
}

function populateCommandInputs(command) {
    const container = document.getElementById('inputContainer');
    // 清空现有输入框
    while (container.children.length > 1) {
        container.removeChild(container.firstChild);
    }
    // 拆分命令并填充输入框
    command.split(' ').forEach(part => {
        const newGroup = createInputGroup();
        newGroup.querySelector('.command-input').value = part;
        container.insertBefore(newGroup, container.lastElementChild);
    });
    showToast('命令已加载到编辑区');
}

// 初始化时加载配置
window.onload = () => {
    addInput();
    const savedConfig = localStorage.getItem('aiConfig');
    if (savedConfig) {
        aiConfig = JSON.parse(savedConfig);
        document.getElementById('apiKey').value = aiConfig.apiKey;
        document.getElementById('apiHost').value = aiConfig.apiHost;
        document.getElementById('modelName').value = aiConfig.modelName;
    }
};