// ==UserScript==
// @name         审判计数器
// @namespace    https://greasyfork.org/zh-CN
// @version      1.0.0
// @description  内嵌于审判成功提示框的本地计数器
// @author       Eirei
// @match        http://dnf.qq.com/cp/*
// @match        https://dnf.qq.com/cp/*
// @icon         https://cdn.jsdelivr.net/gh/keyonchen/script/logo.png
// @grant        GM_addStyle
// @updateURL    https://cdn.jsdelivr.net/gh/keyonchen/script/judgecount.meta.js
// @downloadURL  https://cdn.jsdelivr.net/gh/keyonchen/script/judgecount.user.js
// ==/UserScript==

(function() {
    'use strict';
    // 放大单选框
    let css = `
        .item .list li input[type='radio']  {display: inline-block;vertical-align: middle;zoom: 150%;}
        .item .list li input[type='checkbox'] {display: inline-block;vertical-align: middle;zoom: 150%;}
    `;
    GM_addStyle(css);

    // 新建布局
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
    // 观察节点样式
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
    // 观察节点列表
    const pkcPveLayerOBS = new MutationObserver(function(){
        //  显示视频进度条
        var video_container = document.getElementById("video_container");
        var video = video_container.firstElementChild;
        video.controls = "controls";
        //  折叠判定原因框
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
})();