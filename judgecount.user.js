// ==UserScript==
// @name         审判计数器
// @namespace    https://greasyfork.org/zh-CN
// @version      1.9
// @description  内嵌于审判成功提示框的本地计数器
// @author       Eirei
// @match        http://dnf.qq.com/cp/*
// @match        https://dnf.qq.com/cp/*
// @icon         https://cdn.jsdelivr.net/gh/zhyonchen/script/logo.png
// @updateURL    https://cdn.jsdelivr.net/gh/zhyonchen/script/judgecount.meta.js
// @downloadURL  https://cdn.jsdelivr.net/gh/zhyonchen/script/judgecount.user.js
// grant         none
// ==/UserScript==

(function() {
    'use strict';
    //------自定义按键列表------
    // 更多特殊键值参考链接
    // https://developer.mozilla.org/zh-CN/docs/Web/API/KeyboardEvent/key/Key_Values
    // 启用按键=true/禁用按键=false
    const keyToggle = false;
    // 显示键值=true/隐藏键值=false
    const showKeyText = true;
    // 审核结果
    const resultKeys = ["1","2","3"];
    // 违规类型
    const pkcPveKeys = [
        "q","w","e","r",
        "a","s","d","f",
        "z","x","c","v",
        "Control",""
    ];
    // 违规对象
    const protagonistKeys = ["4","5"];
    // 按钮=["提交结果"]
    const commitKey = ["Escape"];
    // 按钮=["取消","继续审判","修改"]
    const popKeys = ["","`",""];
    //------自定义按键列表------

    // 红色警示文：隐藏=true/显示=false
    const hideContent = false;

    // 视频静音播放：启用=true/禁用=false
    const videoMuted = true;

    // 放大单选框
    let itemCSS = `
        .item .list li input[type='radio']    {zoom: 1.5;-moz-transform: scale(1.5);}
        .item .list li input[type='checkbox'] {zoom: 1.5;-moz-transform: scale(1.5);}
        div {overflow: visible;}
    `;

    // 初始化脚本
    let keymap,parentElement;
    let pkcPveTip = document.getElementById("pkcPveTip");
    let popTeam = document.getElementById("popTeam");
    InitScript();
    function InitScript(){
        addGlobalStyle(itemCSS);
        showRoleName();
        listenKeyUp();
        createColumnLayout();
    };

    // 添加自定义样式表
    function addGlobalStyle(css) {
        var head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head) { return; }
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

    // 捕获控制台信息
    function showRoleName(){
        var actualCode = '(' + function() {
            var old_console_log = window.console.log;
            window.console.log = function(msg){
                old_console_log(msg);
                if(typeof(msg) == "object"){
                    if(msg.hasOwnProperty("jData")){
                        // 记录审判入口
                        var access_id = msg.jData.data.access_id;
                        if(localStorage.getItem("access_id") != access_id){
                            localStorage.setItem("access_id",access_id);
                        }
                        // 标记PVE中的PKC
                        var pattern_type = msg.jData.data.case_info.pattern_type_desc;
                        if(localStorage.getItem("pattern_type") != pattern_type){
                            localStorage.setItem("pattern_type",pattern_type);
                        }
                        // 记录角色名
                        localStorage.setItem("role_name",msg.jData.data.defendant_role_name);
                    }
                };
            };
        } + ')();';
        var script = document.createElement('script');
        script.textContent = actualCode;
        (document.head||document.documentElement).appendChild(script);
        script.remove();
    }

    // 监听按键抬起
    function listenKeyUp(){
        if(!keyToggle){
            return;
        }
        addKeymap(resultKeys,"spsp1","#result input[type='radio']");
        addKeymap(pkcPveKeys,"spsp1","#pkvPve input[type='checkbox']");
        addKeymap(protagonistKeys,"spsp1","#protagonist input[type='radio']");
        addKeymap(commitKey,"spsp1","#judgeCommit");
        addKeymap(popKeys,"popTeam","button");
        document.addEventListener("keyup", function(e){
            // 未匹配按键
            var key = keymap[e.key];
            if (!key) {
                return;
            }
            // 获取当前父元素
            if(!parentElement || parentElement.id != key.parentID){
                parentElement = document.getElementById(key.parentID);
            }
            // 父元素处于隐藏状态
            if(parentElement.style.display == "none"){
                return;
            }
            // 查询子元素
            var items = parentElement.querySelectorAll(key.queryStr);
            if(items.length == 0){
                return;
            }
            var index = parseInt(key.index);
            items[index].click();
        });

    }
    function addKeymap(keys,parentID,queryStr){
        if(!keymap){
            keymap = {};
        }
        for (let i = 0; i < keys.length; i++) {
            var key = keys[i];
            if(key == ""){
                continue;
            }
            keymap[key] = {
                "parentID":parentID,
                "queryStr":queryStr,
                "index":i
            }
        }
    }

    // 计数器分列布局
    function createColumnLayout(){
        var pveInput = createInput("pveCount","pveInput","margin-left: 1px;",1);
        var pkcInput = createInput("pkcCount","pkcInput","margin-left: 1px;",1);
        var button = document.createElement("button");
        var btn_text = document.createTextNode("修改");
        button.appendChild(btn_text);
        button.addEventListener('click',function(){
            var pveCount = parseInt(popTeam.querySelector("#pveInput").value);
            var pkcCount = parseInt(popTeam.querySelector("#pkcInput").value);
            if(isNaN(pveCount)||isNaN(pkcCount)){
                alert("请输入正确的数字");
                return;
            }
            localStorage.setItem("pveCount",pveCount);
            localStorage.setItem("pkcCount",pkcCount);
            alert("修改成功");
        });
        //创建表格
        var tbody = document.createElement('tbody');
        //第一行
        var row_1 = document.createElement('tr');
        var row_1_1 = document.createElement('td');
        row_1_1.appendChild(button);
        var row_1_2 = document.createElement('td');
        row_1_2.appendChild(pveInput);
        var row_1_3 = document.createElement('td');
        row_1_3.appendChild(pkcInput);
        row_1.appendChild(row_1_1);
        row_1.appendChild(row_1_2);
        row_1.appendChild(row_1_3);
        tbody.appendChild(row_1);
        //第二行
        var row_2 = document.createElement('tr');
        var row_2_1 = document.createElement('th');
        row_2_1.innerHTML = "";
        var row_2_2 = document.createElement('th');
        row_2_2.innerHTML = "PVE";
        var row_2_3 = document.createElement('th');
        row_2_3.innerHTML = "PKC";
        row_2.appendChild(row_2_1);
        row_2.appendChild(row_2_2);
        row_2.appendChild(row_2_3);
        tbody.appendChild(row_2);
        //填充表格
        var table = document.createElement('table');
        table.style = "margin-left: 7px;";
        table.appendChild(tbody);
        popTeam.lastElementChild.appendChild(table);
    }

    function createInput(storageId,elementId,style,size){
        var input = document.createElement("input");
        input.id = elementId;
        input.className = "txc";
        input.style = style;
        input.value = localStorage.getItem(storageId) || 0;
        input.size = size;
        return input;
    }

    // 审判视频分类层
    const pkcPveTipOBS = new MutationObserver(function(){
        // 显示视频进度条
        var video = pkcPveTip.parentElement.firstElementChild;
        video.firstElementChild.controls = true;
        // 视频静音播放
        video.firstElementChild.muted = videoMuted;
        // 嵌入玩家角色名
        video.insertBefore(createRoleNameText(),video.firstElementChild);
        video.appendChild(createRoleNameText());
        // 获取审核选项层
        var pkcPveLayer = video.parentElement.lastElementChild;
        // 隐藏红色警示文
        if(hideContent){
            pkcPveLayer.previousElementSibling.style.display = "none";
        }
        // 折叠判定原因框
        var itemText = pkcPveLayer.lastElementChild.previousElementSibling;
        var summary = document.createElement("summary");
        summary.className = "title";
        summary.appendChild(document.createTextNode("判定原因"));
        var details = document.createElement("details");
        details.appendChild(summary);
        details.appendChild(itemText.removeChild(itemText.lastElementChild));
        itemText.removeChild(itemText.firstElementChild);
        itemText.appendChild(details);
        // 显示键值文本项
        if(keyToggle && showKeyText){
            var keys = resultKeys.concat(pkcPveKeys,protagonistKeys);
            var items = pkcPveLayer.querySelectorAll("li");
            for(var i = 0 ; i < items.length; i++){
                var item = items[i];
                var key = keys[i];
                if(!key || key == ""){
                    continue;
                }
                var span = document.createElement("span");
                span.appendChild(document.createTextNode(key));
                item.appendChild(span);
            }
        }
    });
    function createRoleNameText(){
        var text = document.createElement("p");
        text.className = "p2";
        text.style = "position:absolute;"
        text.innerHTML = localStorage.getItem("role_name");
        return text;
    }

    // 审判成功弹出层
    const popTeamOBS = new MutationObserver(function(){
        if(popTeam.style.display != "block"){
            return;
        }
        var access_id = localStorage.getItem("access_id");
        if(access_id == "0_1_5"){
            updateCount("pkcCount","pkcInput");
        }
        if(access_id == "0_1_6"){
            var pattern_type = localStorage.getItem("pattern_type");
            if( pattern_type == 443 ){
                updateCount("pkcCount","pkcInput");
                return;
            }
            updateCount("pveCount","pveInput");
        }
    });
    function updateCount(storageId,elementId){
        var count = localStorage.getItem(storageId);
        if(!count){
            count = 0;
        }
        count = parseInt(count) + 1;
        localStorage.setItem(storageId,count);
        popTeam.querySelector("#"+elementId).value = count;
    }
    // 派遣观察者
    pkcPveTipOBS.observe(pkcPveTip, { childList : true });
    popTeamOBS.observe(popTeam, { attributeFilter:["style"] });

})();