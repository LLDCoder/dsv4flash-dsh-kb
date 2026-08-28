import React, { useState, useRef, useEffect } from 'react';

const PasswordInput = () => {
  const [password, setPassword] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
  }, []);

  const handleInput = (index, e) => {
    const value = e.target.value;
    const singleChar = value[0] || '';
    const newPassword = [...password];
    newPassword[index] = singleChar;
    setPassword(newPassword);
    if (index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && password[index] === '' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {password.map((item, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          maxLength={1}
          value={item ? '·' : ''}
          onChange={(e) => handleInput(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          style={{
            width: '40px',
            height: '50px',
            border: index === 0 ? '2px solid #D9A96C' : '1px solid #E5E7EB',
            borderRadius: '4px',
            textAlign: 'center',
            fontSize: '20px',
          }}
        />
      ))}
    </div>
  );
};

export default PasswordInput;