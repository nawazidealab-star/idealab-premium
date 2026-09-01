import { useEffect } from 'react';

export default function TaskBridgeV9(){
  useEffect(()=>{
    const open=()=>{
      const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
      const target=buttons.find(button=>button.textContent?.toLowerCase().includes('add task')&&button.closest('.il-taskv9-root')===null);
      target?.click();
    };
    window.addEventListener('idealab:new-task',open);
    return()=>window.removeEventListener('idealab:new-task',open);
  },[]);
  return null;
}
