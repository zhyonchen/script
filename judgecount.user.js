// ==UserScript==
// @name         审判计数器
// @namespace    https://greasyfork.org/zh-CN
// @version      1.5
// @description  内嵌于审判成功提示框的本地计数器
// @author       Eirei
// @match        http://dnf.qq.com/cp/*
// @match        https://dnf.qq.com/cp/*
// @icon         https://cdn.jsdelivr.net/gh/keyonchen/script/logo.png
// @updateURL    https://cdn.jsdelivr.net/gh/keyonchen/script/judgecount.meta.js
// @downloadURL  https://cdn.jsdelivr.net/gh/keyonchen/script/judgecount.user.js
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
    const commitKey = ["`"];
    // 按钮=["取消","继续审判","修改"]
    const popKeys = [""," ",""];
    //------自定义按键列表------

    // 红色警示文：隐藏=true/显示=false
    const hideContent = false;

    // 放大单选框
    let itemCSS = `
        .item .list li input[type='radio']    {zoom: 1.5;-moz-transform: scale(1.5);}
        .item .list li input[type='checkbox'] {zoom: 1.5;-moz-transform: scale(1.5);}
        div {overflow: visible;}
    `;
    addGlobalStyle(itemCSS);
    function addGlobalStyle(css) {
        var head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head) { return; }
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

    // 打印主视角玩家的角色名
    showRoleName();
    function showRoleName(){
        var actualCode = '(' + function() {
            var old_console_log = window.console.log;
            window.console.log = function(msg){
                old_console_log(msg);
                if(typeof(msg)=="object"){
                    if(msg.hasOwnProperty("jData")){
                        var p = document.getElementById("role_name");
                        if(!p){
                            p = document.createElement("p");
                            p.id = "role_name";
                            p.className = "p2";
                            var p1 = document.getElementById("lastTeamTime");
                            p1.parentNode.insertBefore(p,p1);
                        }
                        p.innerHTML = msg.jData.data.defendant_role_name;
                    }
                };
            };
        } + ')();';
        var script = document.createElement('script');
        script.textContent = actualCode;
        (document.head||document.documentElement).appendChild(script);
        script.remove();
    }

    // 初始化映射字典
    if(keyToggle){
        let keymap;
        addKeymap(resultKeys,"spsp1","#result input[type='radio']");
        addKeymap(pkcPveKeys,"spsp1","#pkvPve input[type='checkbox']");
        addKeymap(protagonistKeys,"spsp1","#protagonist input[type='radio']");
        addKeymap(commitKey,"spsp1","#judgeCommit");
        addKeymap(popKeys,"popTeam","button");
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
        // 监听抬起事件
        let parentElement;
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

    // 审判视频分类层
    const videoOBS = new MutationObserver(function(){
        // 显示视频进度条
        video.firstElementChild.controls = true;
        // 手机端自动播放
        video.firstElementChild.muted = true;
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
    const video = document.getElementById("video_container");
    const videoOPT = { childList : true };
    videoOBS.observe(video,videoOPT);

    // 审判成功弹出层
    const popTeamOBS = new MutationObserver(function(){
        if(popTeam.style.display != "block"){
            return;
        }
        // 累加计数
        var total_count = localStorage.getItem("TotalCount");
        if(!total_count) {
            total_count = 0;
        };
        total_count = parseInt(total_count) + 1;
        localStorage.setItem("TotalCount",total_count);
        // 响应布局
        var input_count = popTeam.querySelector("#icount");
        if(input_count){
            input_count.value = total_count;
        }
        else
        {
            popTeam.lastElementChild.appendChild(createLayout(total_count));
        };
    });
    const popTeam = document.getElementById("popTeam");
    const popTeamOPT = { attributeFilter:["style"] };
    popTeamOBS.observe(popTeam, popTeamOPT);
    // 新建计数器布局
    function createLayout(count){
        const div = document.createElement("div");
        const input = document.createElement("input");
        input.id = "icount";
        input.className = "txc";
        input.style = "margin-left: 20px;";
        input.value = count;
        input.size = 5;
        const button = document.createElement("button");
        const btn_text = document.createTextNode("修改");
        button.style = "margin-left: 10px;";
        button.appendChild(btn_text);
        button.addEventListener('click',function(){
            var current_count = parseInt(popTeam.querySelector("#icount").value);
            if(isNaN(current_count)){
                alert("请输入正确的数字");
                return;
            };
            localStorage.setItem("TotalCount",current_count);
            alert("修改成功");
        });
        div.appendChild(input);
        div.appendChild(button);
        return div;
    }

})();