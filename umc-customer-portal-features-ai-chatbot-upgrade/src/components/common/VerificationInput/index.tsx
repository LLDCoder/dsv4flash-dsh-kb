import React, { useRef } from 'react';
import { Input } from 'antd';
import type { InputRef } from 'antd/lib/input';

import './index.less';

interface IVerificationProps{
    hide?: boolean;
    codeYzm?: string[];
    onChange: (code: string[]) => void;
    copy?: boolean;
}
export default function VerificationInput({ hide = false, codeYzm = ['','','','','',''], onChange, copy = false }:IVerificationProps){
    const inputsRef = useRef<Array<InputRef | null>>([]);

    function setCodeYzm(code: string[]){
        onChange(code);
    }
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !codeYzm[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    }
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        const numbers = pastedData.replace(/\D/g, '').split('').slice(0, codeYzm.length);
        
        const newCode = [...codeYzm];
        numbers.forEach((num: string, index: number) => {
            newCode[index] = num;
        });
        setCodeYzm(newCode);
        const lastFilledIndex = numbers.length - 1;
        if (lastFilledIndex < codeYzm.length - 1) {
            inputsRef.current[numbers.length]?.focus();
        }
    }
    function handleInputChange(value: string, index: number){
        if (!/^\d?$/.test(value)) return; 
        codeYzm[index] = value;
        setCodeYzm([...codeYzm]);
         if (value && index < codeYzm.length - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    }
    return <div className='create-pin-input-group'>
        {codeYzm.map((item, index)=>{
            return <Input 
            type={!hide ? 'text' : 'password'}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={copy ? handlePaste : undefined}
            ref={(el) => (inputsRef.current[index] = el)} value={item} key={index} onChange={(e)=>handleInputChange(e.target.value, index)} />
        })}
    </div>
}
