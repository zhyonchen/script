// ==UserScript==
// @name         审判计数器
// @namespace    https://greasyfork.org/zh-CN
// @version      1.1
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

    // 捕获控制台输出信息
    unsafeWindow.console.log = function(msg){
        console.log(msg);
        if(typeof(msg)=="object"){
            if(msg.hasOwnProperty("jData")){
                showRoleName(msg.jData.data.defendant_role_name);
            }
        };
    };
    // 显示角色名
    function showRoleName(name){
        var p = document.getElementById("role_name");
        if(!p){
            p = document.createElement("p");
            p.id = "role_name";
            p.className = "p2";
            var p1 = document.getElementById("lastTeamTime");
            p1.parentNode.insertBefore(p,p1);
        }
        p.innerHTML = name;
    }

    // 审判视频分类层
    const pkcPveLayerOBS = new MutationObserver(function(){
        // 隐藏红色提示栏
        //document.getElementById("pkcPveTip").style = "display: none";
        // 显示视频进度条
        document.getElementById("video_container").firstElementChild.controls = "controls";
        // 折叠判定原因框
        var summary = document.createElement("summary");
        summary.className = "title";
        summary.appendChild(document.createTextNode("判定原因"));
        var details = document.createElement("details");
        details.appendChild(summary);
        var trailTextarea = document.getElementById("trailTextarea");
        var parentNode = trailTextarea.parentNode;
        parentNode.removeChild(parentNode.firstElementChild);
        details.appendChild(parentNode.removeChild(trailTextarea));
        parentNode.appendChild(details);
    });
    const pkcPveLayer = document.getElementById("pkcPveLayer");
    const pkcPveLayerOPT = { childList : true };
    pkcPveLayerOBS.observe(pkcPveLayer,pkcPveLayerOPT);

    // 审判成功弹出层
    const popTeamOBS = new MutationObserver(function(mutations){
        let mutation;
        for(mutation of mutations){
            if(mutation.target.style.display != "block"){
                return;
            }
        };
        // 累加计数
        var total_count = localStorage.getItem("TotalCount");
        if(!total_count) {
            total_count = 0;
        };
        total_count = parseInt(total_count) + 1;
        localStorage.setItem("TotalCount",total_count);
        // 响应布局
        var input_count = document.getElementById("icount");
        if(input_count){
            input_count.value = total_count;
        }
        else
        {
            mutation.target.lastElementChild.appendChild(createLayout(total_count));
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
            var current_count = parseInt(document.getElementById("icount").value);
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
    };

})();