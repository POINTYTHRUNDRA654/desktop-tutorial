const l="http://localhost:5173/api/mossy-error-log",i=async(o,e,n,a,r)=>{try{const t={timestamp:new Date().toISOString(),toolName:o,errorMessage:typeof e=="string"?e:e.message,errorStack:typeof e=="string"?void 0:e.stack,context:n,userAction:a,suggestedFix:r};fetch(l,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}).catch(()=>{console.log("[MOSSY] Backend error log not available, using localStorage")});const s=JSON.parse(localStorage.getItem("mossy_error_logs")||"[]");return s.push(t),s.length>50&&s.shift(),localStorage.setItem("mossy_error_logs",JSON.stringify(s)),{success:!0,message:`Error logged locally (${s.length} total). Use Settings > Privacy Settings > Export Error Logs to download.`}}catch(t){return console.error("Failed to log Mossy error:",t),{success:!1,message:"Could not log error"}}},c=()=>{try{const o=JSON.parse(localStorage.getItem("mossy_error_logs")||"[]");if(o.length===0){alert("No error logs to export.");return}let e=`MOSSY ERROR DIAGNOSTIC LOG
Generated: ${new Date().toISOString()}
Total Errors: ${o.length}

================================

`;o.forEach((t,s)=>{e+=`[${s+1}] ${t.timestamp}
`,e+=`Tool: ${t.toolName}
`,e+=`Error: ${t.errorMessage}
`,t.userAction&&(e+=`User Action: ${t.userAction}
`),t.context&&(e+=`Context: ${JSON.stringify(t.context,null,2)}
`),t.errorStack&&(e+=`Stack Trace:
${t.errorStack}
`),t.suggestedFix&&(e+=`Suggested Fix: ${t.suggestedFix}
`),e+=`
--------------------------------

`});const n=new Blob([e],{type:"text/plain"}),a=URL.createObjectURL(n),r=document.createElement("a");r.href=a,r.download=`mossy-error-log-${new Date().toISOString().split("T")[0]}.txt`,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(a)}catch(o){console.error("Failed to export error logs:",o),alert("Failed to export error logs")}},g=(o,e)=>`I encountered an error while attempting to execute the **${o}** function. ${e?`Error details have been logged to **${e}**. Please share this file with your assistant for diagnosis.`:"Error details have been logged locally. Go to **Settings > Diagnostic Tools > Export Error Logs** to download a diagnostic report."} This will help your assistant identify and fix the issue faster.`;export{c as e,g,i as l};
