// ==UserScript==
// @name         审判计数器
// @namespace    https://greasyfork.org/zh-CN
// @version      2.3
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

    const keyDoc = "https://developer.mozilla.org/zh-CN/docs/Web/API/KeyboardEvent/key/Key_Values";
    const path = "https://cdn.jsdelivr.net/gh/zhyonchen/script/";
    const defaultSettingFile = "defaultSetting.json";
    const myStyleFile = "myStyle.css";
    const anchorJson = { "setting": "设置" };

    let keymap, parentElement;
    let logined = document.getElementById("logined");
    let popTeam = document.getElementById("popTeam");
    let spsp1 = document.getElementById('spsp1');
    // 程序主入口
    InitScript();

    function InitScript() {
        loadResource();
        updateKeymap();
        listenKeyUp();
        registerHook();
        createAnchor();
        createColumnLayout();
    }

    async function loadResource() {
        const defaultSettingFilePromise = getStaticFile(defaultSettingFile, 'json');
        const myStyleFilePromise = getStaticFile(myStyleFile, 'text');
        let values = await Promise.all([defaultSettingFilePromise, myStyleFilePromise]);
        if (values[0]) {
            initAndUpdateSetting(values[0]);
        }
        if (values[1]) {
            addGlobalStyle("myStyle", values[1]);
        } else {
            const myStyle = 'div {overflow: visible;}';
            addGlobalStyle("myStyle", myStyle);
        }
    }
    async function getStaticFile(filename, fileType) {
        let url = path + filename;
        let response = await fetch(url, { cache: "no-cache" });
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
            window.console.error(`HTTP error! status: ${response.status} file: ${filename}`);
        }
    }

    function initAndUpdateSetting(defaultSetting) {
        let setting = JSON.parse(localStorage.getItem("setting"));
        if (!setting) {
            if (!defaultSetting) {
                alert("无法加载配置文件，审判计数器部分功能失效");
                return;
            }
            // 本地配置不存在，但默认配置存在，使用默认配置初始化本地配置
            updateLocalSetting(defaultSetting);
        } else if (defaultSetting && setting.fileVersion < defaultSetting.fileVersion) {
            for (let key in defaultSetting) {
                if (key == "fileVersion") {
                    continue;
                }
                if (setting[key]) {
                    defaultSetting[key] = setting[key];
                }
            }
            // 本地配置和默认配置存在，且版本号不一致，使用本地配置替换默认配置
            updateLocalSetting(defaultSetting);
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
    // 加载配置
    async function getLocalSetting() {
        let n = 30;
        while (!localStorage.setting) {
            if (n <= 0) {
                return null;
            }
            await sleep(100);
            n--;
        }
        return JSON.parse(localStorage.setting);
    }
    // 更新配置
    function updateLocalSetting(newSetting) {
        let oldSetting = localStorage.setting;
        localStorage.setting = JSON.stringify(newSetting);
        updateKeymap();
        if (spsp1.style.display == 'none') {
            return;
        }
        if (!oldSetting) {
            return;
        }
        oldSetting = JSON.parse(oldSetting);
        if (oldSetting.oldPlayer && oldSetting.oldPlayer.data == newSetting.oldPlayer.data) {
            updatePkcPveLayout();
            return;
        }
        continueJudge();
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 键值映射
    async function updateKeymap() {
        keymap = {};
        let setting = await getLocalSetting();
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

    function registerHook() {
        let getJudgeCase, getJudgeResult;
        try {
            getJudgeCase = amsCfg_628988.fFlowSubmitEnd;
            getJudgeResult = amsCfg_628989.fFlowSubmitEnd;
        } catch (e) {
            window.console.log(e);
            sleep(100).then(() => registerHook());
            return;
        }
        amsCfg_628988.fFlowSubmitEnd = function(res) {
            getLocalSetting().then((setting) => {
                if (res.iRet == 0) {
                    localStorage.data = JSON.stringify(res.jData.data);
                    if (setting && setting.oldPlayer && setting.oldPlayer.data) {
                        res.jData.data.play_type = 0;
                    }
                }
                getJudgeCase(res);
                if (res.iRet == 0) {
                    if (setting && setting.oldPlayer && setting.oldPlayer.data) {
                        updateOldPlayerLayout();
                    } else {
                        updateTCPlayerLayout();
                    }
                    updatePkcPveLayout();
                }
            });
        };
        amsCfg_628989.fFlowSubmitEnd = function(res) {
            let data = JSON.parse(localStorage.data);
            if (!data) {
                alert("计数失败");
            } else if (data.access_id == "0_0_2") {
                let slider = spsp1.querySelector("#isPKC");
                if (!slider || !slider.checked) {
                    updateCount("pveCount");
                } else {
                    updateCount("pkcCount");
                    slider.checked = false;
                }
            } else if (data.access_id == "0_0_1") {
                updateCount("pkcCount");
            }
            getJudgeResult(res);
        };
    }

    function createAnchor() {
        for (let key in anchorJson) {
            let anchor = document.createElement('a');
            anchor.id = key;
            anchor.href = "javascript:void(0);";
            anchor.textContent = anchorJson[key];
            anchor.addEventListener('click', callDialog);
            logined.appendChild(anchor);
        }
    }

    async function callDialog(e) {
        let dialog = logined.querySelector('dialog');
        if (!dialog) {
            let form = document.createElement('form');
            form.method = 'dialog';
            dialog = document.createElement('dialog');
            dialog.appendChild(form);
            logined.appendChild(dialog);
            dialog.addEventListener('cancel', clearForm);
        }
        if (typeof dialog.showModal != 'function') {
            alert("The dialog API is not supported by this browser");
            return;
        }
        let text = e.target.textContent;
        let form = dialog.querySelector('form');
        callMaskDialog(true);
        switch (text) {
            case "设置":
                await updateSettingForm(form);
                break;
        }
        callMaskDialog(false);
        if (form.innerHTML == "") {
            alert("面板创建失败，请重试");
            return;
        }
        dialog.showModal();
    }

    function clearForm() {
        let dialog = logined.querySelector('dialog');
        dialog.querySelector('form').innerHTML = "";
        dialog.close();
    }

    function callMaskDialog(toggle) {
        let popupMsg = document.getElementById("_PopupMsg_");
        let overlay = document.getElementById("_overlay_");
        if (popupMsg) {
            popupMsg.style.display = toggle ? "block" : "none";
        }
        if (overlay) {
            overlay.style.display = toggle ? "block" : "none";
        }
    }

    async function updateSettingForm(form) {
        if (!form) {
            return;
        }
        let setting = await getLocalSetting();
        if (setting == null) {
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
        // 更多键值
        let anchor = document.createElement('a');
        anchor.href = keyDoc;
        anchor.target = "_blank";
        anchor.rel = "noopener";
        anchor.textContent = "更多键值";
        ul.appendChild(anchor);
        // 按钮栏
        let button_li = document.createElement('li');
        button_li.className = "tac";
        let div = document.createElement('div');
        div.className = "tip-con";
        div.appendChild(createFormButton("重设", onResetButtonClick));
        div.appendChild(createFormButton("保存", onSaveButtonClick));
        div.appendChild(createFormButton("取消", clearForm));
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

    async function onResetButtonClick() {
        let oldSetting = localStorage.setting;
        localStorage.removeItem("setting");
        await loadResource();
        if (!localStorage.setting) {
            alert("重设失败，还原先前配置");
            localStorage.setting = oldSetting;
            logined.querySelector("#setting").click();
        } else {
            alert("重设成功,已初始化本地配置");
            clearForm();
        }
    }

    async function onSaveButtonClick(e) {
        let setting = await getLocalSetting();
        if (!setting) {
            alert("保存失败");
            return;
        }
        let form = getParentByTag(e.target, 'FORM');
        if (!form) {
            alert("保存失败");
            return;
        }
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
        await updateLocalSetting(setting);
        clearForm();
        alert("保存成功");
    }

    function getParentByTag(element, tag) {
        while (element && element.tagName != tag) {
            element = element.parentElement;
        }
        return element;
    }

    // 更新老播放器
    async function updateOldPlayerLayout() {
        let video_container = spsp1.querySelector("#video_container");
        let video = video_container.querySelector("video");
        video.id = "oldPlayer";
        video.controls = true;
        // 禁止Safari全屏
        video.setAttribute("playsinline", "");
        // 视频静音播放
        video.muted = true;
        // 嵌入玩家角色名
        video_container.insertBefore(createRoleNameText(), video);
        video_container.appendChild(createVideoSpan());
    }
    // 更新TC播放器
    async function updateTCPlayerLayout() {
        let video_container = spsp1.querySelector("#cloud_video_container");
        let textArray = video_container.querySelectorAll('.p2');
        if (textArray.length == 0) {
            let player = video_container.querySelector("#cloud-player");
            player.appendChild(createRoleNameText());
            video_container.appendChild(createVideoSpan());
            let span = video_container.querySelector('.vjs-menu-item-text');
            span.addEventListener('click', copyVideoUrl);
            return;
        }
        let roleName = getRoleName();
        for (let text of textArray) {
            text.innerHTML = roleName;
        }
    }

    // 获取角色名
    function getRoleName() {
        let data = localStorage.data;
        if (data) {
            data = JSON.parse(data);
            return data.defendant_role_name;
        }
        return "";
    }

    function createRoleNameText() {
        let span = document.createElement("span");
        span.className = "p2";
        span.style = "position:absolute;"
        span.innerHTML = getRoleName();
        return span;
    }

    function createVideoSpan() {
        let p = document.createElement('p');
        let button = createReloadButton();
        p.appendChild(button);
        let data = localStorage.data;
        if (data) {
            data = JSON.parse(data);
            if (data.access_id == "0_0_2") {
                let slider = createPkcSlider();
                p.appendChild(slider);
            }
        }
        return p;
    }

    // 重载视频
    function createReloadButton() {
        let button = createRoleNameText();
        button.id = "reload";
        button.style = '';
        button.addEventListener('click', () => {
            let tcPlayer = spsp1.querySelector("#cloud-player_html5_api");
            let oldPlayer = spsp1.querySelector("#oldPlayer");
            if (tcPlayer) {
                tcPlayer.load();
            }
            if (oldPlayer) {
                oldPlayer.load();
            }
        })
        return button;
    }

    // PKC滑块
    function createPkcSlider() {
        let label = document.createElement('label');
        label.className = 'switch';
        label.style.float = 'right';
        let input = document.createElement('input');
        input.id = 'isPKC';
        input.type = 'radio';
        input.addEventListener('change', function(e) {
            input.addEventListener('click', () => {
                e.target.checked = !e.target.checked;
            }, { once: true });
        })
        let span = document.createElement('span');
        span.className = 'slider';
        label.appendChild(input);
        label.appendChild(span);
        return label;
    }

    async function copyVideoUrl() {
        const clipboard = navigator.clipboard;
        if (!clipboard) {
            alert("The clipboard API is not supported by this browser");
            return;
        }
        let data = localStorage.data;
        if (data) {
            data = JSON.parse(data);
            await clipboard.writeText(data.video_url);
            alert("复制视频链接成功");
        }
    }

    // 更新审判分类面板
    async function updatePkcPveLayout() {
        let pkcPveLayer = document.getElementById("pkcPveLayer");
        if (pkcPveLayer.children.length == 0) {
            return;
        }
        let setting = await getLocalSetting();
        if (!setting) {
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
            if (setting.showKeyText.data) {
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
        // 记录倍速
        let commitButton = pkcPveLayer.querySelector("#judgeCommit");
        commitButton.addEventListener('click', changeDefaultRate);
    }

    // 改变默认倍速
    function changeDefaultRate() {
        let rate = spsp1.querySelector('.vjs-playback-rate-value');
        if (!rate) {
            return;
        }
        if (!cloudPlayer || typeof cloudPlayer.defaultPlaybackRate != 'function') {
            return;
        }
        let str = rate.innerHTML.split('x');
        cloudPlayer.defaultPlaybackRate(str[0]);
    }

    // 计数器分列布局
    function createColumnLayout() {
        // 标记继续审判按钮
        let judgeNext = popTeam.querySelectorAll(".tac button")[1];
        if (judgeNext) {
            judgeNext.id = "judgeNext";
            judgeNext.setAttribute('onclick', "javascript:amsSubmit(135125, 628988);")
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