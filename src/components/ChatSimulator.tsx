import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  isHtml?: boolean;
  time: string;
  buttons?: string[];
}

export default function ChatSimulator() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeButtons, setActiveButtons] = useState<string[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const autoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to scroll to bottom smoothly
  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Main simulation sequence
  const startSimulation = () => {
    // Clear timeouts and reset state
    if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
    setMessages([]);
    setIsTyping(false);
    setActiveButtons([]);

    const timeString = () => {
      const now = new Date();
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    // 1. Initial User Message
    setTimeout(() => {
      setMessages([
        {
          id: 'u1',
          sender: 'user',
          text: 'Olá, gostaria de confirmar se meu exame está agendado para amanhã.',
          time: timeString()
        }
      ]);

      // 2. Bot Typing 1
      setTimeout(() => {
        setIsTyping(true);

        // 3. Bot Response 1
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [
            ...prev,
            {
              id: 'b1',
              sender: 'bot',
              text: 'Olá! Sou o assistente inteligente da <strong>Help Chat Bot</strong>. Vou verificar para você. Qual o seu CPF ou nome completo?',
              isHtml: true,
              time: timeString()
            }
          ]);

          // 4. User Reply 2
          setTimeout(() => {
            setMessages(prev => [
              ...prev,
              {
                id: 'u2',
                sender: 'user',
                text: 'Claro, meu nome é Mariana Silva dos Santos.',
                time: timeString()
              }
            ]);

            // 5. Bot Typing 2
            setTimeout(() => {
              setIsTyping(true);

              // 6. Bot Response 2 (Interactive)
              setTimeout(() => {
                setIsTyping(false);
                setMessages(prev => [
                  ...prev,
                  {
                    id: 'b2',
                    sender: 'bot',
                    text: 'Localizei Mariana! ✅ Seu exame de <strong>Ultrassonografia</strong> está agendado para amanhã, <strong>17/07 às 09:30h</strong> na Clínica Bem Estar.<br/><br/>Você confirma seu comparecimento?',
                    isHtml: true,
                    time: timeString()
                  }
                ]);
                setActiveButtons(['Sim, confirmo', 'Não, preciso remarcar']);

                // Auto-advance if no user interaction after 4 seconds
                autoTimeoutRef.current = setTimeout(() => {
                  handleChoice('Sim, confirmo', true);
                }, 4500);

              }, 1800);
            }, 1200);
          }, 2000);
        }, 1500);
      }, 1000);
    }, 500);
  };

  useEffect(() => {
    startSimulation();
    return () => {
      if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
    };
  }, []);

  const handleChoice = (choice: string, isAuto = false) => {
    if (!isAuto) {
      setHasInteracted(true);
      if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
    }

    // Deactivate buttons
    setActiveButtons([]);

    const timeString = () => {
      const now = new Date();
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    // 7. Add user selected message
    setMessages(prev => [
      ...prev,
      {
        id: `choice-reply-${Date.now()}`,
        sender: 'user',
        text: choice,
        time: timeString()
      }
    ]);

    // 8. Bot Typing 3
    setTimeout(() => {
      setIsTyping(true);

      // 9. Bot Final Message
      setTimeout(() => {
        setIsTyping(false);
        const finalMsg = choice === 'Sim, confirmo' 
          ? 'Maravilhoso! Sua presença foi confirmada e sua vaga foi otimizada no sistema. 🚀<br/><br/>Obrigada por confirmar!' 
          : 'Sem problemas, Mariana! 🗓️ Um de nossos atendentes humanos entrará em contato para te enviar novos horários disponíveis. Obrigado por avisar!';

        setMessages(prev => [
          ...prev,
          {
            id: `final-reply-${Date.now()}`,
            sender: 'bot',
            text: finalMsg,
            isHtml: true,
            time: timeString()
          }
        ]);

        // Loop back after 6 seconds
        autoTimeoutRef.current = setTimeout(() => {
          startSimulation();
        }, 6000);

      }, 1500);
    }, 1000);
  };

  return (
    <div className="phone-frame">
      <div className="phone-notch"></div>
      
      {/* Phone Header */}
      <div className="phone-header">
        <div className="phone-header-info">
          <div className="avatar-clinic">
            <img src="/logo.webp" alt="Help Chat Bot avatar" className="logo-avatar-img" />
          </div>
          <div>
            <div className="clinic-name">Help Chat Bot</div>
            <div className="clinic-status">
              <span className="status-indicator"></span>
              <span>Online (API Oficial)</span>
            </div>
          </div>
        </div>
        <div className="phone-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {hasInteracted && (
            <button 
              onClick={() => { setHasInteracted(false); startSimulation(); }} 
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                fontSize: '0.65rem',
                padding: '4px 8px',
                borderRadius: '100px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}
              title="Reiniciar Simulação"
            >
              🔄 Reiniciar
            </button>
          )}
          <span className="phone-action-icon" style={{ cursor: 'pointer' }}>📞</span>
          <span className="phone-action-icon" style={{ cursor: 'pointer' }}>⋮</span>
        </div>
      </div>
      
      {/* Phone Body */}
      <div 
        className="phone-body" 
        ref={chatBodyRef} 
        style={{ scrollBehavior: 'smooth', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={{ originX: msg.sender === 'user' ? 1 : 0 }}
              className={`chat-msg msg-${msg.sender}`}
            >
              {msg.isHtml ? (
                <div dangerouslySetInnerHTML={{ __html: msg.text }} />
              ) : (
                <p>{msg.text}</p>
              )}
              <span className="msg-time">{msg.time}</span>
            </motion.div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              style={{ originX: 0 }}
              className="chat-msg msg-bot"
            >
              <div className="typing-indicator" style={{ display: 'flex', gap: '4px', padding: '6px 8px', background: 'transparent' }}>
                <span style={{ animationDelay: '-0.32s' }}></span>
                <span style={{ animationDelay: '-0.16s' }}></span>
                <span></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Buttons (Interactive) */}
        {activeButtons.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bot-buttons"
            style={{ width: 'fit-content', marginLeft: '12px', alignSelf: 'flex-start' }}
          >
            {activeButtons.map((btnText, i) => (
              <motion.button
                key={btnText}
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(2, 158, 248, 0.2)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleChoice(btnText)}
                className="bot-btn"
                style={{
                  background: 'var(--phone-btn-bg)',
                  border: '1px solid var(--phone-btn-border)',
                  color: 'var(--color-secondary)',
                  padding: '8px 14px',
                  borderRadius: '100px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: 'fit-content'
                }}
              >
                {btnText}
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Phone Footer */}
      <div className="phone-footer">
        <span className="footer-emoji">⭐</span>
        <div className="footer-input">Mensagem</div>
        <span className="footer-mic">🎙️</span>
      </div>
    </div>
  );
}
