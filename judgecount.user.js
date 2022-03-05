// ==UserScript==
// @name         审判计数器
// @namespace    https://greasyfork.org/zh-CN
// @version      2.1
// @description  内嵌于审判成功提示框的本地计数器
// @author       Eirei
// @match        http://dnf.qq.com/cp/*spxt/*
// @match        https://dnf.qq.com/cp/*spxt/*
// @updateURL    https://cdn.jsdelivr.net/gh/zhyonchen/script/judgecount.meta.js
// @downloadURL  https://cdn.jsdelivr.net/gh/zhyonchen/script/judgecount.user.js
// @icon         https://cdn.jsdelivr.net/gh/zhyonchen/script/logo.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const path = "https://cdn.jsdelivr.net/gh/zhyonchen/script";
    const defaultSettingFile = "defaultSetting.json";
    const myStyleFile = "myStyle.css";

    let keymap, parentElement;
    let logined = document.getElementById("logined");
    let popTeam = document.getElementById("popTeam");
    let isLocked = false;

    // 程序主入口
    InitScript();

    function InitScript() {
        loadResource();
        listenKeyUp();
        registerHook();
        createSettingAnchor();
        createSettingLayout();
        createColumnLayout();
    }

    async function loadResource() {
        const defaultSettingFilePromise = await getStaticFile(defaultSettingFile, 'json');
        const myStyleFilePromise = await getStaticFile(myStyleFile, 'text');
        // 等待执行结果返回
        let values = await Promise.all([defaultSettingFilePromise, myStyleFilePromise]);
        if (values.length > 0) {
            let defaultSetting = values[0];
            let myStyle = values[1];
            // 检查并更新本地配置
            initAndUpdateSetting(defaultSetting);
            // 注入自定义CSS
            addGlobalStyle("myStyle", myStyle);
        }
        // 更新按键映射
        updateKeymap(await getLocalSetting());
    }

    async function getStaticFile(filename, fileType) {
        let url = path + '/' + filename;
        let response = await fetch(url);
        if (response.ok) {
            let content;
            switch (fileType) {
                case 'json':
                    content = await response.json();
                    break;
                case 'text':
                    content = await response.text();
                    break;
            }
            return content;
        } else {
            window.console.log(`HTTP error! status: ${response.status} fileType: ${filename}`);
        }
    }

    function initAndUpdateSetting(defaultSetting) {
        let setting = JSON.parse(localStorage.getItem("setting"));
        if (!setting) {
            if (!defaultSetting) {
                alert("初始化配置失败，请刷新页面");
                return;
            }
            localStorage.setItem("setting", JSON.stringify(defaultSetting));
        } else if (defaultSetting && setting.fileVersion < defaultSetting.fileVersion) {
            // 用本地配置替换默认配置
            for (var key in defaultSetting) {
                if (key == "fileVersion") {
                    continue;
                }
                if (setting.key) {
                    defaultSetting[key] = setting[key];
                }
            }
            // 更新本地配置
            localStorage.setItem("setting", JSON.stringify(defaultSetting));
        }
    }

    function addGlobalStyle(id, css) {
        let head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head || !css) { return; }
        style = document.createElement('style');
        style.id = id;
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

    // 键值映射
    function updateKeymap(setting) {
        keymap = {};
        if (!setting || !setting.keyToggle.data) {
            return;
        }
        for (let key in setting) {
            if (key == "fileVersion") {
                continue;
            }
            let item = setting[key];
            if (item.type != "keycode") {
                continue;
            }

            for (let i = 0; i < item.data.length; i++) {
                keymap[item.data[i]] = {
                    "parentID": item.parentID,
                    "queryStr": item.queryStr,
                    "index": i
                }
            }
        }
        if (Object.keys(keymap).length == 0) {
            alert("按键功能失效，请刷新页面");
        }
    }

    // 监听按键抬起
    function listenKeyUp() {
        document.addEventListener("keyup", function(e) {
            if (!keymap) {
                return;
            }
            if (!keymap.hasOwnProperty(e.key)) {
                return;
            }
            let key = keymap[e.key];
            // 获取当前父元素
            if (!parentElement || parentElement.id != key.parentID) {
                parentElement = document.getElementById(key.parentID);
            }
            // 父元素处于隐藏状态
            if (parentElement.style.display == "none") {
                return;
            }
            // 查询子元素
            var items = parentElement.querySelectorAll(key.queryStr);
            if (items.length == 0) {
                return;
            }
            var index = parseInt(key.index);
            items[index].click();
        });
    }

    async function getLocalSetting() {
        // 尝试直接加载
        let setting = JSON.parse(localStorage.getItem("setting"));
        if (!setting) {
            // 等待再次加载
            await sleep(100);
            setting = JSON.parse(localStorage.getItem("setting"));
        }
        return setting;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function registerHook() {
        window.addEventListener('load', function() {
            let getJudgeCase = amsCfg_628988.fFlowSubmitEnd;
            amsCfg_628988.fFlowSubmitEnd = function(res) {
                getJudgeCase(res);
                if (res.iRet == "0") {
                    localStorage.setItem("data", JSON.stringify(res.jData.data));
                    updateVideoLayout();
                    updatePkcPveLayout();
                }
            };

            let getJudgeResult = amsCfg_628989.fFlowSubmitEnd;
            amsCfg_628989.fFlowSubmitEnd = function(res) {
                let data = JSON.parse(localStorage.getItem("data"));
                if (!data) {
                    alert("计数失败");
                } else if (data.access_id == "0_1_6") {
                    if (data.case_info.pattern_type_desc == 443) {
                        updateCount("pkcCount");
                    } else {
                        updateCount("pveCount");
                    }
                } else if (data.access_id == "0_1_5") {
                    updateCount("pkcCount");
                }
                getJudgeResult(res);
            };
        });
    }

    function createSettingAnchor() {
        let settingAnchor = document.createElement('a');
        settingAnchor.href = "javascript:void(0);";
        settingAnchor.textContent = "设置"
        settingAnchor.addEventListener('click', onSettingAnchorClick);
        logined.appendChild(settingAnchor);
    }

    function onSettingAnchorClick() {
        let dialog = document.getElementById("settingLayout");
        if (!dialog) {
            alert("设置面板正在创建中……");
            return;
        }
        if (typeof dialog.showModal != 'function') {
            alert("The dialog API is not supported by this browser");
            return;
        }
        if (!isLocked) {
            isLocked = true;
            getLocalSetting()
                .then((setting) => {
                    updateSettingForm(setting);
                    if (dialog.querySelector('input')) {
                        dialog.showModal();
                    };
                    isLocked = false;
                })
                .catch(e => alert(e));
        } else {
            alert("设置面板正在创建中……");
        }
    }

    function createSettingLayout() {
        // 对话框
        let dialog = document.createElement("dialog");
        dialog.id = "settingLayout";
        dialog.addEventListener('cancel', clearSettingForm);
        // 表单
        let form = document.createElement('form');
        form.id = "settingForm";
        form.method = "dialog";
        // 创建布局
        dialog.appendChild(form);
        logined.appendChild(dialog);
    }

    function updateSettingForm(setting) {
        if (!setting) {
            alert("加载配置失败，无法创建设置面板");
            return;
        }
        let form = logined.querySelector('#settingForm');
        if (!form) {
            alert("页面已过期，请刷新页面");
            return;
        }
        // 排序
        let ul = document.createElement('ul');
        for (var key in setting) {
            if (key == "fileVersion") {
                continue;
            }
            let item = setting[key];
            // 标题行
            let title_li = document.createElement('li');
            title_li.innerHTML = item.title;
            ul.appendChild(title_li);
            // 数据行
            if (item.type == "toggle") {
                let input = document.createElement('input');
                input.name = key;
                input.type = "checkbox";
                if (item.data) {
                    input.setAttribute('checked', "");
                }
                let data_li = document.createElement('li');
                data_li.innerHTML = `<label class="switch">${input.outerHTML}<span class="slider"></span></label>`
                ul.appendChild(data_li);
            }
            if (item.type == "keycode") {
                let data_li = document.createElement('li');
                for (let i = 0; i < item.data.length; i++) {
                    if (i > 3 && i % 4 == 0) {
                        //每隔4个input换行
                        ul.appendChild(data_li);
                        data_li = document.createElement('li');
                    }
                    let input = document.createElement('input');
                    input.size = 4;
                    input.name = key;
                    input.value = item.data[i];
                    input.style = "margin-left: 4px;";
                    input.className = "tac";
                    data_li.appendChild(input);
                }
                ul.appendChild(data_li);
            }
        }
        // 按钮栏
        let button_li = document.createElement('li');
        button_li.className = "tac";
        let div = document.createElement('div');
        div.className = "tip-con";
        div.appendChild(createFormButton("重设", onResetButtonClick));
        div.appendChild(createFormButton("保存", onSaveButtonClick));
        div.appendChild(createFormButton("取消", clearSettingForm));
        button_li.appendChild(div);
        ul.appendChild(button_li);
        form.appendChild(ul);
    }

    function createFormButton(text, event) {
        let button = document.createElement('button');
        button.textContent = text;
        button.addEventListener('click', event);
        return button;
    }

    function onResetButtonClick() {
        let currentSetting = localStorage.getItem("setting");
        localStorage.setItem("setting", null);
        clearSettingForm();
        loadResource().then(() => {
            getLocalSetting().then((setting) => {
                updateSettingForm(setting);
                alert("重设成功，请重新保存");
                logined.querySelector('#settingLayout').showModal();
            });
        }).catch((e) => {
            localStorage.setItem("setting", currentSetting);
            alert("重设失败,本地配置未发生改变");
        })
    }

    async function onSaveButtonClick() {
        let setting = await getLocalSetting();
        if (!setting) {
            alert("保存失败");
            return;
        }
        let form = document.getElementById('settingForm');
        let inputs = form.querySelectorAll('input');
        for (let i = 0; i < inputs.length; i++) {
            let input = inputs[i];
            let key = input.name;
            if (setting.hasOwnProperty(key)) {
                let item = setting[key];
                let type = item.type;
                if (type == "toggle") {
                    item.data = input.checked;
                    continue;
                }
                if (type == "keycode") {
                    let lastInput = inputs[i - 1];
                    if (lastInput && lastInput.name != input.name) {
                        item.data = [];
                    }
                    item.data.push(input.value);
                }
                setting[key] = item;
            }
        }
        localStorage.setItem("setting", JSON.stringify(setting));
        updateKeymap(setting);
        clearSettingForm();
        updatePkcPveLayout();
        alert("保存成功");
    }

    function clearSettingForm() {
        document.getElementById('settingLayout').close();
        document.getElementById('settingForm').innerHTML = ""
    }

    // 更新视频层
    function updateVideoLayout() {
        let setting = JSON.parse(localStorage.getItem("setting"));
        let video_container = document.getElementById("video_container");
        let video = video_container.querySelector("video");
        video.id = "video";
        video.controls = true;
        // 禁止Safari全屏
        video.setAttribute("playsinline", "");
        // 视频静音播放
        video.muted = setting.videoMuted.data;
        // 嵌入玩家角色名
        video_container.insertBefore(createRoleNameText(), video);
        // 视频重载按钮
        video_container.appendChild(createReloadButton());
    }

    // 更新分类层
    function updatePkcPveLayout() {
        let setting = JSON.parse(localStorage.getItem("setting"));
        let pkcPveLayer = document.getElementById("pkcPveLayer");
        if (pkcPveLayer.children.length == 0) {
            return;
        }
        // 隐藏红色警告
        let pkcPveTip = pkcPveLayer.previousElementSibling;
        if (setting.hideWarn.data) {
            pkcPveTip.style.display = "none";
        } else {
            pkcPveTip.style.display = "";
        }
        // 更新键值文本
        let items = pkcPveLayer.querySelectorAll("li");
        let keys = setting.resultKey.data.concat(setting.pkcPveKey.data, setting.protagonistKey.data);
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            let span = item.querySelector(`span`);
            let word = span.innerHTML.split(' ');
            if (setting.keyToggle.data) {
                let key = keys[i];
                if (!key || key == "") {
                    continue;
                }
                span.innerHTML = word[0] + " " + key;
            } else {
                span.innerHTML = word[0];
            }
        }
        // 折叠判定原因
        let trailTextarea = pkcPveLayer.querySelector("#trailTextarea");
        let defaultTextareaHTML = `<div class="title">判定原因</div>${trailTextarea.outerHTML}`;
        let foldTextareaHTML = `<details><summary class="title">判定原因</summary>${trailTextarea.outerHTML}</details>`;
        let itemText = pkcPveLayer.querySelector(".item.text");
        if (setting.foldJudgeResult.data) {
            itemText.innerHTML = foldTextareaHTML;
        } else {
            itemText.innerHTML = defaultTextareaHTML;
        }
    }
    // 角色名文本
    function createRoleNameText() {
        var text = document.createElement("p");
        text.className = "p2";
        text.style = "position:absolute;"
        text.innerHTML = JSON.parse(localStorage.getItem("data")).defendant_role_name;
        return text;
    }
    // 重载按钮
    function createReloadButton(text) {
        var div = document.createElement("div");
        div.id = "reload";
        div.appendChild(createRoleNameText());
        div.addEventListener('click', function() {
            document.getElementById("video").load();
        });
        return div;
    }

    // 计数器分列布局
    function createColumnLayout() {
        // 标记继续审判按钮
        let judgeNext = popTeam.querySelectorAll(".tac button")[1];
        if (judgeNext) {
            judgeNext.id = "judgeNext";
        }
        // 输入框
        let pveInput = createPkcPveInput("pveCount");
        let pkcInput = createPkcPveInput("pkcCount");
        // 按钮
        let updateButton = document.createElement("button");
        updateButton.id = "updateButton";
        updateButton.textContent = "修改"
        // 表格
        let table = document.createElement('table');
        table.style = "margin-left: 7px;";
        table.innerHTML = `<tr><td>${updateButton.outerHTML}</td><td>${pveInput.outerHTML}</td><td>${pkcInput.outerHTML}</td></tr><tr><th></th><th>PVE</th><th>PKC</th></tr>`;
        table.querySelector('#updateButton').addEventListener('click', onUpdateButtonClick);
        // 生成布局
        popTeam.lastElementChild.appendChild(table);
    }

    function createPkcPveInput(id) {
        var input = document.createElement("input");
        input.id = id;
        input.className = "txc";
        input.style = "margin-left: 1px;";
        input.setAttribute('value', localStorage.getItem(id) || 0);
        input.size = 1;
        return input;
    }

    function updateCount(id) {
        let count = localStorage.getItem(id);
        if (!count) {
            count = 0;
        }
        count = parseInt(count) + 1;
        localStorage.setItem(id, count);
        popTeam.querySelector("#" + id).value = count;
    }

    function onUpdateButtonClick() {
        let pveCount = parseInt(popTeam.querySelector("#pveCount").value);
        let pkcCount = parseInt(popTeam.querySelector("#pkcCount").value);
        if (isNaN(pveCount) || isNaN(pkcCount)) {
            alert("请输入正确的数字");
            return;
        }
        localStorage.setItem("pveCount", pveCount);
        localStorage.setItem("pkcCount", pkcCount);
        alert("修改成功");
    };

})();