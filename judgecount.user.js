// ==UserScript==
// @name         审判计数器
// @namespace    https://script.silksong.site
// @version      2.5.5
// @description  多功能计数
// @author       Eirei
// @match        http://dnf.qq.com/cp/*spxt/*
// @match        https://dnf.qq.com/cp/*spxt/*
// @updateURL    https://script.silksong.site/judgecount.meta.js
// @downloadURL  https://script.silksong.site/judgecount.user.js
// @icon         https://script.silksong.site/logo.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const keyDocument = "https://developer.mozilla.org/zh-CN/docs/Web/API/KeyboardEvent/key/Key_Values";
    const database = "https://data.silksong.site:8000";
    const staticFilePath = "https://script.silksong.site";
    const defaultSettingFile = "/defaultSetting.json";
    const myStyleFile = "/myStyle.css";
    const anchorJson = { "setting": "设置", "score": "分数"};

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
        const defaultSettingFilePromise = fetchData(staticFilePath + defaultSettingFile, {}, 'json');
        const myStyleFilePromise = fetchData(staticFilePath + myStyleFile, {}, 'text');
        let values = await Promise.all([defaultSettingFilePromise, myStyleFilePromise]);
        if (values[0]) {
            initAndUpdateSetting(values[0]);
        }
        if (values[1]) {
            addGlobalStyle("myStyle", values[1]);
        } else {
            const myStyle = `div {overflow: visible;}
            .closeButton {position:absolute;top:0;right:0;border:none;}
            .item .list li input[type='radio']    {zoom: 1.5;-moz-transform: scale(1.5);}
            .item .list li input[type='checkbox'] {zoom: 1.5;-moz-transform: scale(1.5);}`;
            addGlobalStyle("myStyle", myStyle);
        }
        updateMyStyle();
    }
    async function fetchData(url, option = {}, type = 'text') {
        callMaskDialog(true);
        let content;
        try {
            let response = await fetch(url, option);
            if (response.ok) {
                switch (type) {
                    case 'json':
                        content = await response.json();
                        break;
                    case 'text':
                        content = await response.text();
                        break;
                }
            } else {
                alert(`${response.status}：${await response.text()}`);
                content = null;
            }
        } catch (e) {
            window.console.error(`${e}：Fail to fetch ${url}`);
            content = null;
        }
        callMaskDialog(false);
        return content;
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

    function addGlobalStyle(title, css) {
        let head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head || !css) { return; }
        style = document.createElement('style');
        style.title = title;
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

    function changeGlobalStyle(title,selectorText,newStyleCss){
        let styleSheetList = document.styleSheets;
        let rules,i,j;
        for(i = 0 ; i < styleSheetList.length; i++){
            let styleSheet = styleSheetList[i];
            if(!styleSheet||!styleSheet.title){
                continue;
            }
            if(styleSheet.title == title){
                rules = styleSheet.cssRules;
                break;
            }
        }
        for(j = 0; j< rules.length; j++){
            if(!rules[j]){
                continue;
            } 
            if(rules[j].selectorText == selectorText){
                let style = rules[j].style;
                for(let key in newStyleCss){
                    if(!style[key]){
                        continue;
                    }
                    style[key] = newStyleCss[key];
                }
                break;
            }
        }
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
        updateMyStyle();
        if (!oldSetting) {
            return;
        }
        oldSetting = JSON.parse(oldSetting);
        if(spsp1.style.display == 'none'){
            return;
        }

        if (oldSetting.oldPlayer && oldSetting.oldPlayer.data == newSetting.oldPlayer.data) {
            // 未修改播放器则只更新文本框
            updatePkcPveLayout();
            return;
        }
        // 变换播放器
        continueJudge();
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 键值映射
    async function updateKeymap() {
        keymap = {};
        let setting = await getLocalSetting();
        if (!setting || !setting.keyToggle || !setting.keyToggle.data) {
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

    async function updateMyStyle(){
        let setting = await getLocalSetting();
        if (!setting || !setting.zoomInput) {
            return;
        }
        let num = parseFloat(setting.zoomInput.data);
        if(isNaN(num)){
            return;
        }
        changeGlobalStyle("myStyle",".item .list li input[type=\"radio\"]", {"zoom":num ,"-moz-transform":`scale(${num})`});
        changeGlobalStyle("myStyle",".item .list li input[type=\"checkbox\"]", {"zoom":num,"-moz-transform":`scale(${num})`});
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
            let closeButton = createFormButton("X", clearForm);
            closeButton.className = "closeButton";
            let div = document.createElement('div');
            div.name = 'form';
            dialog = document.createElement('dialog');
            dialog.appendChild(closeButton);
            dialog.appendChild(div);
            logined.appendChild(dialog);
            dialog.addEventListener('cancel', clearForm);
        }
        if (typeof dialog.showModal != 'function') {
            alert("The dialog API is not supported by this browser");
            return;
        }
        let text = e.target.textContent;
        let div = dialog.querySelector('div');
        switch (text) {
            case "设置":
                await updateSettingForm(div);
                break;
            case "分数":
                await updateVerifyForm(div);
                break;
        }
        if (div.innerHTML == "") {
            alert("面板创建失败，请重试");
            return;
        }
        dialog.style.display = "block";
        dialog.showModal();
    }

    function clearForm() {
        let dialog = logined.querySelector('dialog');
        if (!dialog) {
            return;
        }
        dialog.style.display = "none";
        dialog.querySelector('div').innerHTML = "";
        dialog.close();
    }

    function callMaskDialog(toggle) {
        let dialog = logined.querySelector('dialog')
        let popupMsg = document.getElementById("_PopupMsg_");
        let overlay = document.getElementById("_overlay_");
        if (dialog) {
            dialog.style.display = toggle ? "none" : "block";
        }
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
                let label = createCheckbox();
                let input = label.querySelector('input');
                input.name = key;
                if (item.data) {
                    input.setAttribute('checked', "");
                }
                let data_li = document.createElement('li');
                data_li.appendChild(label);
                ul.appendChild(data_li);
            }
            if(item.type == "text"){
                let data_li = document.createElement('li');
                let input = document.createElement('input');
                input.size = 4;
                input.name = key;
                input.value = item.data;
                data_li.appendChild(input);
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
                    data_li.appendChild(input);
                }
                ul.appendChild(data_li);
            }
        }
        // 更多键值
        let anchor = document.createElement('a');
        anchor.href = keyDocument;
        anchor.target = "_blank";
        anchor.rel = "noopener";
        anchor.textContent = "更多键值";
        ul.appendChild(anchor);
        // 按钮栏
        let button_li = document.createElement('li');
        button_li.className = "tac";
        button_li.appendChild(createFormButton("重设", onResetButtonClick));
        button_li.appendChild(createFormButton("保存", onSaveButtonClick));
        button_li.appendChild(createFormButton("取消", clearForm));
        ul.appendChild(button_li);
        form.appendChild(ul);
    }

    function createCheckbox() {
        let label = document.createElement('label');
        label.className = "switch";
        let input = document.createElement('input');
        input.type = "checkbox";
        let span = document.createElement('span');
        span.className = "slider";
        label.appendChild(input);
        label.appendChild(span);
        return label;
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
            alert("重设失败，本地配置保持不变");
            localStorage.setting = oldSetting;
        } else {
            alert("重设成功,已初始化本地配置");
            clearForm();
            logined.querySelector("#setting").click();
        }
    }

    async function onSaveButtonClick(e) {
        let setting = await getLocalSetting();
        if (!setting) {
            alert("保存失败");
            return;
        }
        let dialog = getParentByTag(e.target, 'DIALOG');
        let inputs = dialog.querySelectorAll('input');
        for (let i = 0; i < inputs.length; i++) {
            let input = inputs[i];
            let key = input.name;
            if (setting.hasOwnProperty(key)) {
                let item = setting[key];
                let type = item.type;
                if (type == "toggle") {
                    item.data = input.checked;
                }
                if (type == "text"){
                    item.data = input.value;
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
            if (element.tagName == 'BODY') {
                return null;
            }
        }
        return element;
    }

    async function updateVerifyForm(form) {
        if (!form) {
            return;
        }
        let token = localStorage.token || "";
        if (token == "") {
            setTimeout(e => alert("初次使用请输入任意字符的验证码并牢记然后点击查询"), 100);
        }
        form.innerHTML = `<table><tbody><tr><td>验证码</td><td><input type='text' size=6 value=${token}></input></td></tr></tbody></table>`
        let div = document.createElement('div');
        div.className = "tac tip-con ";
        div.style.padding = "0px";
        div.appendChild(createFormButton("修改", onRecodeButtonClick));
        div.appendChild(createFormButton("查询", onQueryButtonClick));
        div.appendChild(createFormButton("取消", clearForm));
        form.appendChild(div);
    }

    async function postJSON(type, code, localData) {
        let body = {
            "type": type,
            "uuid": LoginManager.getUserUin(),
            "code": code,
            "data": localData
        }
        let option = {
            method: 'POST',
            headers: {
                'Accept': 'text/plain,application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        }
        if (type == "recode") {
            return await fetchData(database, option);
        }
        return await fetchData(database, option, 'json');
    }

    async function onRecodeButtonClick(e) {
        let dialog = getParentByTag(e.target, 'DIALOG');
        let tbody = dialog.querySelector('tbody');
        let inputs = tbody.querySelectorAll('input');
        if (inputs.length == 1) {
            tbody.innerHTML += `<tr><td>新验证码</td><td><input type='text' size=6></input></td></tr>`;
            alert("请输入新验证码并确认修改");
            return;
        }
        if (!inputs[0].value || !inputs[1].value) {
            alert("验证码或新验证码不能为空");
            return;
        }
        let data = await postJSON("recode", inputs[0].value, inputs[1].value);
        if (!data) {
            return;
        }
        alert(data);
        localStorage.token = inputs[0].value = inputs[1].value;
        getParentByTag(inputs[1], 'TR').remove();
    }

    async function onQueryButtonClick(e) {
        let dialog = getParentByTag(e.target, 'DIALOG');
        let form = dialog.querySelector('div');
        let input = form.querySelector('input');
        if (!input.value) {
            alert("验证码不能为空");
            return;
        }
        let data = await postJSON("query", input.value, {});
        if (!data) {
            return;
        }
        localStorage.token = input.value;
        updateScroeForm(data);
    }

    function updateScroeForm(data) {
        let dialog = logined.querySelector('dialog');
        let form = logined.querySelector('div');
        let thead = "<table><thead><th></th></th><th>日期</th><th>PVE</th><th>PKC</th><th>分数</th><th>指令</th></thead>";
        let localTbody = `<tbody name=local></tbody>`
        let totalTbody = `<tbody name=total><tr><td><select><option value=thisMonth>本月</option><option value=lastMonth>上月</option><option value=all>全部</option></select></td><td name=totalDay>0</td><td name=pve>0</td><td name=pkc>0</td><td name=score>0</td><td name=cmd></td><tr></tbody>`;
        let remoteTbody = `<tbody name=remote></tbody></table>`;
        form.innerHTML = thead + localTbody + totalTbody + remoteTbody;
        // 本地
        let localElement = form.querySelector("tbody[name='local']");
        createLocalScoreItem(localElement);
        // 远程
        let remoteElement = form.querySelector("tbody[name='remote']");
        updateRemoteScoreItem("thisMonth", remoteElement, data);
        localStorage.score = JSON.stringify(data);
        // 总计
        let totalElement = form.querySelector("tbody[name='total']");
        let selectElement = totalElement.querySelector("select");
        selectElement.addEventListener('change', onTotalSelectChange);
        let result = AccumulateScore("thisMonth", remoteElement.querySelectorAll('tr'));
        for (let key in result) {
            let td = totalElement.querySelector(`td[name=${key}]`);
            td.textContent = result[key];
        }
        let cmd = totalElement.querySelector("td[name='cmd']");
        cmd.appendChild(createFormButton("修改", onCoverButtonClick));
        cmd.appendChild(createFormButton("删除", onRemoveButtonClick));
        cmd.appendChild(createFormButton("全选", onSelectAllButtonClick));
    }

    function calculateScore(pve, pkc) {
        let score = 0;
        // 计算超出200的分数
        let extra = pve + pkc - 200;
        if (extra > 0) {
            if (extra > 100) {
                //总视频量超出300归位
                extra = 100;
            }
            score += extra * 0.5;
            score += 200;
        } else {
            score = pve + pkc;
        }
        // 计数pkc的额外分数
        score += pkc > 50 ? 50 : pkc;
        // 超出归位
        return score > 300 ? 300 : score;
    }

    function createLocalScoreItem(tbody) {
        let date = new Date();
        let thisMonth = date.getMonth() + 1;
        let monthSelect = createDateSelect(thisMonth, 12);
        monthSelect.addEventListener('change', onMonthSelectChange);
        let daySelect = createDateSelect(date.getDate(), calculateDayCount(thisMonth));
        let pveCount = parseInt(localStorage.pveCount);
        let pkcCount = parseInt(localStorage.pkcCount);
        let score = calculateScore(pveCount, pkcCount);
        let tr = document.createElement('tr');
        tr.innerHTML = `
        <td>本地</td>
        <td name="md"></td>
        <td>${createPkcPveInput("pveCount",pveCount).outerHTML}</td>
        <td>${createPkcPveInput("pkcCount",pkcCount).outerHTML}</td>
        <td name="score">${score}</td>
        <td name="cmd"></td>`
        let md = tr.querySelector("td[name='md']");
        md.appendChild(monthSelect);
        md.appendChild(daySelect);
        let cmd = tr.querySelector("td[name='cmd']");
        cmd.appendChild(createFormButton("修改", onUpdateButtonClick));
        cmd.appendChild(createFormButton("上传", onUploadButtonClick));
        tbody.appendChild(tr);
    }

    function createDateSelect(index, num) {
        let select = document.createElement('select');
        for (let i = 1; i <= num; i++) {
            let option = document.createElement('option');
            option.textContent = i;
            if (index == i) {
                option.setAttribute('selected', '');
            }
            select.appendChild(option);
        }
        return select;
    }

    function calculateDayCount(month) {
        let date = new Date();
        date.setMonth(month,0);
        return date.getDate();
    }

    function onMonthSelectChange(e) {
        let monthSelect = e.target;
        let option = monthSelect.options[monthSelect.selectedIndex];
        let daySelect = monthSelect.nextElementSibling;
        daySelect.outerHTML = createDateSelect(1, calculateDayCount(option.textContent)).outerHTML;
    }

    function updateRemoteScoreItem(type, tbody, data) {
        let date = new Date();
        let localMonth;
        switch (type) {
            case "thisMonth":
                localMonth = date.getMonth() + 1;
                break;
            case "lastMonth":
                localMonth = date.getMonth();
                break;
            case "all":
                localMonth = -1;
                break;
            default:
                localMonth = date.getMonth() + 1;
        }
        tbody.innerHTML = "";
        let keys = Object.keys(data);
        for (let i = keys.length - 1; i >= 0; i--) {
            let key = keys[i];
            let today = key;
            if (localMonth != -1) {
                let remoteMonth = Math.floor(today / 100);
                if (remoteMonth != localMonth) {
                    continue;
                }
            }
            let count = data[key];
            let pveCount = parseInt(count["PVE"]);
            let pkcCount = parseInt(count["PKC"]);
            let score = calculateScore(pveCount, pkcCount);
            let tr = document.createElement('tr');
            tr.innerHTML = `
            <td>远程</td>
            <td name="today">${today}</td>
            <td>${createPkcPveInput("pveCount",pveCount).outerHTML}</td>
            <td>${createPkcPveInput("pkcCount",pkcCount).outerHTML}</td>
            <td name="score">${score}</td>
            <td name="cmd"></td>`
            let td = tr.querySelector("td[name='cmd']");
            td.appendChild(createCheckbox());
            tbody.appendChild(tr);
        }
    }

    async function onUploadButtonClick(e) {
        let td = e.target.parentElement;
        let tr = td.parentElement;
        let today, pveCount, pkcCount;
        try {
            let md = tr.querySelector("td[name='md']");
            if (!md) {
                let date = new Date();
                today = (date.getMonth() + 1) * 100 + date.getDate();
            } else {
                let monthSelect = md.querySelector('select');
                let daySelect = monthSelect.nextElementSibling;
                let month = parseInt(monthSelect.options[monthSelect.selectedIndex].textContent);
                let day = parseInt(daySelect.options[daySelect.selectedIndex].textContent);
                if (isNaN(month) || isNaN(day)) {
                    throw new error("请选择正确的日期");
                }
                today = month * 100 + day;
            }
            pveCount = parseInt(tr.querySelector("input[name='pveCount']").value);
            pkcCount = parseInt(tr.querySelector("input[name='pkcCount']").value);
            if (isNaN(pveCount) || isNaN(pkcCount)) {
                throw new error("请输入正确的数字");
            }
        } catch (e) {
            alert(e);
            return;
        }
        if (!localStorage.token) {
            alert("上传失败,请通过分数查询设置验证码");
            return;
        }
        let localData = {};
        localData[today] = { "PVE": pveCount, "PKC": pkcCount };
        let data = await postJSON("upload", localStorage.token, localData);
        if (!data) {
            return;
        }
        localStorage.pveCount = 0;
        localStorage.pkcCount = 0;
        updatePopForm();
        let score = tr.querySelector("td[name='score']");
        if (score) {
            updateScroeForm(data);
        } else {
            clearForm();
            alert("上传成功");
        }
    }

    function onTotalSelectChange(e) {
        let select = e.target;
        let option = select.options[select.selectedIndex];
        let table = getParentByTag(select, 'TABLE');
        let tbody = table.querySelector("tbody[name='remote']");
        if (localStorage.score) {
            updateRemoteScoreItem(option.value, tbody, JSON.parse(localStorage.score));
        }
        let items = tbody.querySelectorAll('tr');
        let result = AccumulateScore(option.value, items);
        tbody = table.querySelector("tbody[name='total']");
        for (let key in result) {
            let td = tbody.querySelector(`td[name=${key}]`);
            td.textContent = result[key];
        }
    }

    function AccumulateScore(type, items) {
        let date = new Date();
        let thisMonth = date.getMonth() + 1;
        let lastMonth = thisMonth - 1;
        let totalDay = 0;
        let totalPVE = 0;
        let totalPKC = 0;
        let totalScore = 0;
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            let today = parseInt(item.querySelector("td[name='today']").textContent);
            let res = Math.floor(today / 100);
            if (type == "thisMonth" && res != thisMonth) {
                continue;
            }
            if (type == "lastMonth" && res != lastMonth) {
                continue;
            }
            let pve = parseInt(item.querySelector("input[name='pveCount']").value);
            let pkc = parseInt(item.querySelector("input[name='pkcCount']").value);
            let score = parseInt(item.querySelector("td[name='score']").textContent);
            totalDay++;
            totalPVE += pve;
            totalPKC += pkc;
            totalScore += score;
        }
        return { "totalDay": totalDay, "pve": totalPVE, "pkc": totalPKC, "score": totalScore };
    }

    async function onCoverButtonClick(e) {
        let table = getParentByTag(e.target, 'TABLE');
        let tbody = table.querySelector("tbody[name='remote']");
        let checkbox = tbody.querySelectorAll('input:checked');
        if (checkbox && checkbox.length == 0) {
            alert("请勾选需要修改的远程指令滑块");
            return;
        }
        let localData = {};
        for (let input of checkbox) {
            let tr = getParentByTag(input, 'TR');
            let today = tr.querySelector("td[name='today']");
            let pveCount = tr.querySelector("input[name='pveCount']");
            let pkcCount = tr.querySelector("input[name='pkcCount']");
            if (!today || !pveCount || !pkcCount) {
                continue;
            }
            pveCount = parseInt(pveCount.value);
            pkcCount = parseInt(pkcCount.value);
            if (isNaN(pveCount) || isNaN(pkcCount)) {
                continue;
            }
            localData[today.textContent] = { "PVE": pveCount, "PKC": pkcCount };
        }
        let data = await postJSON('cover', localStorage.token, localData);
        if (!data) {
            return;
        }
        updateScroeForm(data);
    }

    async function onRemoveButtonClick(e) {
        let table = getParentByTag(e.target, 'TABLE');
        let tbody = table.querySelector("tbody[name='remote']");
        let checkbox = tbody.querySelectorAll('input:checked');
        if (checkbox && checkbox.length == 0) {
            alert("请勾选需要删除的远程指令滑块");
            return;
        }
        let localData = [];
        for (let input of checkbox) {
            let tr = getParentByTag(input, 'TR');
            let today = tr.querySelector("td[name='today']");
            if (!today) {
                continue;
            }
            localData.push(today.textContent);
        }
        let data = await postJSON('remove', localStorage.token, localData);
        if (!data) {
            return;
        }
        updateScroeForm(data);
    }

    function onSelectAllButtonClick(e){
        let table = getParentByTag(e.target, 'TABLE');
        let tbody = table.querySelector("tbody[name='remote']");
        let checkbox = tbody.querySelectorAll('input');
        for(let i = 0; i<checkbox.length;i++){
            if(!checkbox[i]){
                continue;
            }
            checkbox[i].click();
        }
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

    // 复制链接
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
        if (!localStorage.pveCount) {
            localStorage.pveCount = 0;
        }
        if (!localStorage.pkcCount) {
            localStorage.pkcCount = 0;
        }
        let pveInput = createPkcPveInput("pveCount", localStorage.pveCount);
        let pkcInput = createPkcPveInput("pkcCount", localStorage.pkcCount);
        // 表格
        let table = document.createElement('table');
        table.style = "margin-left: 7px;";
        table.innerHTML = `<tr><th></th><th>PVE</th><th>PKC</th><th></th><th></th></tr>
        <tr><td name=cmd></td><td>${pveInput.outerHTML}</td><td>${pkcInput.outerHTML}</td><td name=cmd></td></tr>`;
        let cmd = table.querySelectorAll("td[name='cmd']");
        cmd[0].appendChild(createFormButton("修改", onUpdateButtonClick));
        cmd[1].appendChild(createFormButton("上传", onUploadButtonClick));
        // 生成布局
        popTeam.lastElementChild.appendChild(table);
    }

    function createPkcPveInput(name, count) {
        var input = document.createElement("input");
        input.name = name;
        input.className = "txc";
        input.style = "margin-left: 1px;";
        input.setAttribute('value', count);
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
        popTeam.querySelector(`input[name=${id}]`).value = count;
    }

    function updatePopForm() {
        let pveInput = popTeam.querySelector("input[name='pveCount']");
        let pkcInput = popTeam.querySelector("input[name='pkcCount']");
        pveInput.value = localStorage.pveCount;
        pkcInput.value = localStorage.pkcCount;
    }

    function onUpdateButtonClick(e) {
        let tr = getParentByTag(e.target, 'TR');
        let inputs = tr.querySelectorAll('input');
        if (!inputs) {
            return;
        }
        let pveCount = parseInt(inputs[0].value);
        let pkcCount = parseInt(inputs[1].value);
        if (isNaN(pveCount) || isNaN(pkcCount)) {
            alert("请输入正确的数字");
            return;
        }
        localStorage.setItem("pveCount", pveCount);
        localStorage.setItem("pkcCount", pkcCount);
        alert("修改成功");
        let score = tr.querySelector("td[name='score']");
        if (!score) {
            return;
        }
        score.textContent = calculateScore(pveCount, pkcCount);
    };

})();