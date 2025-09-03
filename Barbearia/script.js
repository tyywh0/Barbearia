// Barbearia Premium - Sistema de Agendamento
// JavaScript Vanilla com funcionalidades completas

class BarbeariaSystem {
    constructor() {
        this.appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        this.barbers = {
            carlos: { name: 'Carlos Silva', phone: '11999999001' },
            joao: { name: 'João Santos', phone: '11999999002' },
            pedro: { name: 'Pedro Lima', phone: '11999999003' },
            rafael: { name: 'Rafael Costa', phone: '11999999004' }
        };
        this.services = {
            corte: { name: 'Corte Tradicional', price: 35, duration: 30 },
            barba: { name: 'Barba + Bigode', price: 25, duration: 20 },
            completo: { name: 'Pacote Completo', price: 55, duration: 45 }
        };
        this.workingHours = {
            start: 8,
            end: 18,
            interval: 30 // minutos
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setMinDate();
        this.loadAppointments();
        this.setupPhoneMask();
    }

    setupEventListeners() {
        const form = document.getElementById('bookingForm');
        const dateInput = document.getElementById('appointmentDate');
        const barberSelect = document.getElementById('barberSelect');
        
        form.addEventListener('submit', (e) => this.handleBooking(e));
        dateInput.addEventListener('change', () => this.updateAvailableHours());
        barberSelect.addEventListener('change', () => this.updateAvailableHours());
    }

    setMinDate() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const dateInput = document.getElementById('appointmentDate');
        dateInput.min = tomorrow.toISOString().split('T')[0];
        
        // Set max date to 30 days from now
        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + 30);
        dateInput.max = maxDate.toISOString().split('T')[0];
    }

    setupPhoneMask() {
        const phoneInput = document.getElementById('clientPhone');
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 11) {
                value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            } else if (value.length >= 7) {
                value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
            } else if (value.length >= 3) {
                value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
            }
            e.target.value = value;
        });
    }

    updateAvailableHours() {
        const date = document.getElementById('appointmentDate').value;
        const barber = document.getElementById('barberSelect').value;
        const timeSelect = document.getElementById('appointmentTime');
        
        timeSelect.innerHTML = '<option value="">Selecione um horário</option>';
        
        if (!date || !barber) return;
        
        const selectedDate = new Date(date + 'T00:00:00');
        const dayOfWeek = selectedDate.getDay();
        
        // Check if it's Sunday (0) - closed
        if (dayOfWeek === 0) {
            timeSelect.innerHTML = '<option value="">Fechado aos domingos</option>';
            return;
        }
        
        // Saturday has different hours (8-14)
        const endHour = dayOfWeek === 6 ? 14 : this.workingHours.end;
        
        const availableSlots = this.generateTimeSlots(this.workingHours.start, endHour);
        const bookedSlots = this.getBookedSlots(date, barber);
        
        availableSlots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot;
            option.textContent = slot;
            
            if (bookedSlots.includes(slot)) {
                option.disabled = true;
                option.textContent += ' (Ocupado)';
                option.style.color = '#ef4444';
            }
            
            timeSelect.appendChild(option);
        });
    }

    generateTimeSlots(startHour, endHour) {
        const slots = [];
        for (let hour = startHour; hour < endHour; hour++) {
            slots.push(`${hour.toString().padStart(2, '0')}:00`);
            if (hour < endHour - 1 || (hour === endHour - 1 && this.workingHours.interval === 30)) {
                slots.push(`${hour.toString().padStart(2, '0')}:30`);
            }
        }
        return slots;
    }

    getBookedSlots(date, barber) {
        return this.appointments
            .filter(apt => apt.date === date && apt.barber === barber && apt.status !== 'cancelled')
            .map(apt => apt.time);
    }

    async handleBooking(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const appointmentData = {
            id: Date.now().toString(),
            name: document.getElementById('clientName').value,
            phone: document.getElementById('clientPhone').value,
            service: document.getElementById('serviceType').value,
            barber: document.getElementById('barberSelect').value,
            date: document.getElementById('appointmentDate').value,
            time: document.getElementById('appointmentTime').value,
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };
        
        // Validate form
        if (!this.validateAppointment(appointmentData)) {
            return;
        }
        
        // Check if slot is still available
        const bookedSlots = this.getBookedSlots(appointmentData.date, appointmentData.barber);
        if (bookedSlots.includes(appointmentData.time)) {
            this.showNotification('Este horário já foi ocupado. Por favor, escolha outro.', 'error');
            this.updateAvailableHours();
            return;
        }
        
        // Save appointment
        this.appointments.push(appointmentData);
        this.saveAppointments();
        
        // Send WhatsApp message
        this.sendWhatsAppConfirmation(appointmentData);
        
        // Show success message
        this.showNotification('Agendamento realizado com sucesso!', 'success');
        
        // Reset form and update UI
        e.target.reset();
        this.setMinDate();
        this.loadAppointments();
        
        // Scroll to appointments section
        document.querySelector('#appointmentsList').scrollIntoView({ behavior: 'smooth' });
    }

    validateAppointment(data) {
        if (!data.name.trim()) {
            this.showNotification('Por favor, informe seu nome.', 'error');
            return false;
        }
        
        if (!data.phone.trim() || data.phone.replace(/\D/g, '').length < 11) {
            this.showNotification('Por favor, informe um número de WhatsApp válido.', 'error');
            return false;
        }
        
        if (!data.service) {
            this.showNotification('Por favor, selecione um serviço.', 'error');
            return false;
        }
        
        if (!data.barber) {
            this.showNotification('Por favor, selecione um barbeiro.', 'error');
            return false;
        }
        
        if (!data.date) {
            this.showNotification('Por favor, selecione uma data.', 'error');
            return false;
        }
        
        if (!data.time) {
            this.showNotification('Por favor, selecione um horário.', 'error');
            return false;
        }
        
        return true;
    }

    sendWhatsAppConfirmation(appointment) {
        const service = this.services[appointment.service];
        const barber = this.barbers[appointment.barber];
        const date = new Date(appointment.date + 'T00:00:00');
        const formattedDate = date.toLocaleDateString('pt-BR');
        
        const message = `🔥 *BARBEARIA PREMIUM* 🔥\n\n` +
            `✅ *Agendamento Confirmado!*\n\n` +
            `👤 *Cliente:* ${appointment.name}\n` +
            `💇‍♂️ *Serviço:* ${service.name}\n` +
            `💰 *Valor:* R$ ${service.price},00\n` +
            `✂️ *Barbeiro:* ${barber.name}\n` +
            `📅 *Data:* ${formattedDate}\n` +
            `🕐 *Horário:* ${appointment.time}\n\n` +
            `📍 *Endereço:* Rua das Barbearias, 123\n` +
            `📞 *Contato:* (11) 99999-9999\n\n` +
            `⚠️ *Importante:*\n` +
            `• Chegue 10 minutos antes\n` +
            `• Em caso de cancelamento, avise com 2h de antecedência\n` +
            `• Traga documento com foto\n\n` +
            `Obrigado pela preferência! 🙏`;
        
        const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        // Schedule reminder (simulate)
        this.scheduleReminder(appointment);
    }

    scheduleReminder(appointment) {
        // In a real application, this would integrate with a backend service
        // For demo purposes, we'll show a notification
        setTimeout(() => {
            console.log(`Lembrete agendado para ${appointment.name} - ${appointment.date} às ${appointment.time}`);
        }, 1000);
    }

    loadAppointments() {
        const appointmentsList = document.getElementById('appointmentsList');
        
        if (this.appointments.length === 0) {
            appointmentsList.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <i class="fas fa-calendar-times text-4xl mb-4"></i>
                    <p class="text-lg">Nenhum agendamento encontrado</p>
                    <p class="text-sm">Faça seu primeiro agendamento acima!</p>
                </div>
            `;
            return;
        }
        
        // Sort appointments by date and time
        const sortedAppointments = this.appointments
            .sort((a, b) => {
                const dateA = new Date(a.date + 'T' + a.time);
                const dateB = new Date(b.date + 'T' + b.time);
                return dateB - dateA;
            })
            .slice(0, 10); // Show only last 10 appointments
        
        appointmentsList.innerHTML = sortedAppointments
            .map(appointment => this.createAppointmentCard(appointment))
            .join('');
    }

    createAppointmentCard(appointment) {
        const service = this.services[appointment.service];
        const barber = this.barbers[appointment.barber];
        const date = new Date(appointment.date + 'T00:00:00');
        const formattedDate = date.toLocaleDateString('pt-BR');
        const isUpcoming = new Date(appointment.date + 'T' + appointment.time) > new Date();
        
        const statusClass = {
            confirmed: 'status-confirmed',
            pending: 'status-pending',
            cancelled: 'status-cancelled'
        }[appointment.status];
        
        const statusText = {
            confirmed: 'Confirmado',
            pending: 'Pendente',
            cancelled: 'Cancelado'
        }[appointment.status];
        
        return `
            <div class="appointment-card bg-gray-700 p-6 rounded-lg">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h4 class="text-xl font-bold text-amber-400">${appointment.name}</h4>
                        <p class="text-gray-300">${appointment.phone}</p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-sm font-medium ${statusClass}">
                        ${statusText}
                    </span>
                </div>
                
                <div class="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-gray-400 text-sm">Serviço</p>
                        <p class="font-medium">${service.name} - R$ ${service.price},00</p>
                    </div>
                    <div>
                        <p class="text-gray-400 text-sm">Barbeiro</p>
                        <p class="font-medium">${barber.name}</p>
                    </div>
                    <div>
                        <p class="text-gray-400 text-sm">Data</p>
                        <p class="font-medium">${formattedDate}</p>
                    </div>
                    <div>
                        <p class="text-gray-400 text-sm">Horário</p>
                        <p class="font-medium">${appointment.time}</p>
                    </div>
                </div>
                
                ${isUpcoming && appointment.status === 'confirmed' ? `
                    <div class="flex space-x-3">
                        <button onclick="barbeariaSystem.sendReminder('${appointment.id}')" 
                                class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                            <i class="fab fa-whatsapp mr-1"></i> Lembrete
                        </button>
                        <button onclick="barbeariaSystem.cancelAppointment('${appointment.id}')" 
                                class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                            <i class="fas fa-times mr-1"></i> Cancelar
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    sendReminder(appointmentId) {
        const appointment = this.appointments.find(apt => apt.id === appointmentId);
        if (!appointment) return;
        
        const service = this.services[appointment.service];
        const barber = this.barbers[appointment.barber];
        const date = new Date(appointment.date + 'T00:00:00');
        const formattedDate = date.toLocaleDateString('pt-BR');
        
        const message = `🔔 *LEMBRETE - BARBEARIA PREMIUM* 🔔\n\n` +
            `Olá ${appointment.name}!\n\n` +
            `Lembrando do seu agendamento:\n\n` +
            `💇‍♂️ *Serviço:* ${service.name}\n` +
            `✂️ *Barbeiro:* ${barber.name}\n` +
            `📅 *Data:* ${formattedDate}\n` +
            `🕐 *Horário:* ${appointment.time}\n\n` +
            `📍 *Local:* Rua das Barbearias, 123\n\n` +
            `⏰ Chegue 10 minutos antes!\n` +
            `Nos vemos em breve! 😊`;
        
        const whatsappUrl = `https://wa.me/55${appointment.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        this.showNotification('Lembrete enviado via WhatsApp!', 'success');
    }

    cancelAppointment(appointmentId) {
        if (!confirm('Tem certeza que deseja cancelar este agendamento?')) {
            return;
        }
        
        const appointmentIndex = this.appointments.findIndex(apt => apt.id === appointmentId);
        if (appointmentIndex === -1) return;
        
        this.appointments[appointmentIndex].status = 'cancelled';
        this.saveAppointments();
        this.loadAppointments();
        
        this.showNotification('Agendamento cancelado com sucesso!', 'warning');
    }

    saveAppointments() {
        localStorage.setItem('appointments', JSON.stringify(this.appointments));
    }

    showNotification(message, type = 'success') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Utility functions
function scrollToBooking() {
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
}

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.barbeariaSystem = new BarbeariaSystem();
    
    // Add smooth scrolling to navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Add loading animation to form submission
    const form = document.getElementById('bookingForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    
    form.addEventListener('submit', () => {
        submitButton.innerHTML = '<div class="loading-spinner inline-block mr-2"></div> Processando...';
        submitButton.disabled = true;
        
        setTimeout(() => {
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }, 2000);
    });
});

// Service Worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered: ', registration))
            .catch(registrationError => console.log('SW registration failed: ', registrationError));
    });
}
