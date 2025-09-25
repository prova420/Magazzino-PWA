// Gestione notifiche
const Notifications = {
    init() {
        this.notificationElement = document.getElementById('notification');
    },

    show(message, isError = false) {
        if (!this.notificationElement) return;

        this.notificationElement.textContent = message;
        this.notificationElement.className = `notification ${isError ? 'error' : ''}`;
        this.notificationElement.style.display = 'block';

        setTimeout(() => {
            this.notificationElement.style.display = 'none';
        }, 3000);
    },

showLowStockAlert(itemName, threshold) {
    const message = `⚠️ ATTENZIONE: "${itemName}" è sotto il livello minimo (${threshold})!`;
    this.show(message, true);
    
    // Aggiungi un suono di avviso (opzionale)
    this.playAlertSound();
},

playAlertSound() {
    // Crea un suono di avviso semplice (beep)
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.log('AudioContext non supportato:', error);
    }
}}
// AGGIUNGI QUESTA RIGA ALLA FINE DI OGNI FILE MODULO
if (typeof window !== 'undefined') {
    window.Notifications = Notifications; // Sostituisci con il nome corretto del modulo
}