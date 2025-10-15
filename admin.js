require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;
const SHIPPING_API_URL = process.env.SHIPPING_API_URL || 'https://envio.chetomi.cl';

app.use(express.json());
app.use(cors());

// MIDDLEWARE DE AUTENTICACIÓN
app.use((req, res, next) => {
  if (req.path.startsWith('/api-proxy')) {
    return next();
  }
  
  const auth = req.headers.authorization;
  const expectedAuth = 'Basic ' + Buffer.from('chetomi:admin123').toString('base64');
  
  if (!auth || auth !== expectedAuth) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Panel Admin Chetomi"');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(401).send(`
      <h1>🔒 Acceso Restringido</h1>
      <p>Panel de Administración - Chetomi Envíos</p>
      <p><strong>Usuario:</strong> chetomi</p>
      <p><strong>Contraseña:</strong> admin123</p>
    `);
  }
  
  next();
});

// PÁGINA PRINCIPAL CON GESTIÓN DE HORARIOS Y PRECIOS
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - Chetomi Envíos</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 16px; 
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #667eea, #764ba2); 
            color: white; 
            padding: 40px 30px; 
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .nav { 
            display: flex; 
            background: #f8f9fa; 
            border-bottom: 1px solid #dee2e6;
        }
        .nav-item { 
            flex: 1; 
            padding: 20px; 
            text-align: center; 
            cursor: pointer; 
            border: none;
            background: none;
            font-size: 16px;
            font-weight: 500;
            transition: all 0.3s;
        }
        .nav-item:hover { background: #e9ecef; }
        .nav-item.active { 
            background: #007bff; 
            color: white; 
        }
        .content { 
            padding: 40px 30px; 
            min-height: 500px;
        }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .service-card { 
            background: #f8f9fa; 
            border: 1px solid #dee2e6; 
            border-radius: 12px; 
            padding: 25px; 
            margin: 20px 0;
            transition: all 0.3s;
        }
        .service-card.enabled { border-left: 5px solid #28a745; }
        .service-card.disabled { border-left: 5px solid #dc3545; opacity: 0.7; }
        .service-title { 
            font-size: 1.4em; 
            font-weight: 600; 
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .status-badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .status-badge.active { background: #d4edda; color: #155724; }
        .status-badge.inactive { background: #f8d7da; color: #721c24; }
        .status-badge.available { background: #d1ecf1; color: #0c5460; }
        .status-badge.unavailable { background: #f8d7da; color: #721c24; }
        .pricing-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .pricing-table th {
            background: #007bff;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        .pricing-table td {
            padding: 15px;
            border-bottom: 1px solid #dee2e6;
        }
        .pricing-table tr:hover { background: #f8f9fa; }
        .pricing-table input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 6px;
            font-size: 14px;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s;
            margin: 5px;
        }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-danger { background: #dc3545; color: white; }
        .btn-warning { background: #ffc107; color: #212529; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .alert {
            padding: 15px 20px;
            border-radius: 8px;
            margin: 15px 0;
            font-weight: 500;
        }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .alert-info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            border: 1px solid #dee2e6;
        }
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        .stat-label {
            color: #6c757d;
            font-weight: 500;
        }
        .loading {
            text-align: center;
            padding: 40px;
            color: #6c757d;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #6c757d;
            border-top: 1px solid #dee2e6;
        }
        .form-group { margin: 20px 0; }
        .form-group label { 
            display: block; 
            margin-bottom: 8px; 
            font-weight: 600; 
            color: #495057; 
        }
        .form-group input, .form-group select {
            width: 100%;
            padding: 12px;
            border: 1px solid #ced4da;
            border-radius: 8px;
            font-size: 14px;
        }
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .days-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 8px;
            margin: 10px 0;
        }
        .day-checkbox {
            text-align: center;
            padding: 12px 8px;
            border: 2px solid #ced4da;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
        }
        .day-checkbox.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
        }
        .day-checkbox:hover {
            border-color: #007bff;
            background: #f8f9fa;
        }
        .day-checkbox.active:hover {
            background: #0056b3;
        }
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 34px;
        }
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 34px;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 26px;
            width: 26px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        input:checked + .slider {
            background-color: #007bff;
        }
        input:checked + .slider:before {
            transform: translateX(26px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛍️ Panel de Administración</h1>
            <p>Gestión Completa de Envíos - Chetomi</p>
        </div>

        <div class="nav">
            <button class="nav-item active" onclick="showTab('dashboard')">📊 Dashboard</button>
            <button class="nav-item" onclick="showTab('pricing')">💰 Precios</button>
            <button class="nav-item" onclick="showTab('schedules')">⏰ Horarios</button>
            <button class="nav-item" onclick="showTab('debug')">🔍 Debug</button>
        </div>

        <div class="content">
            <div id="dashboard" class="tab-content active">
                <h2>📊 Dashboard en Tiempo Real</h2>
                <div id="dashboard-stats" class="stats-grid">
                    <div class="loading">Cargando estadísticas...</div>
                </div>
                
                <div id="services-status">
                    <h3>Estado Actual de Servicios</h3>
                    <div id="live-status"></div>
                </div>
            </div>

            <div id="pricing" class="tab-content">
                <h2>💰 Gestión de Precios por Kilómetros</h2>
                <div id="pricing-services">
                    <div class="loading">Cargando configuración de precios...</div>
                </div>
            </div>

            <div id="schedules" class="tab-content">
                <h2>⏰ Configuración de Horarios y Calendario</h2>
                <div id="schedules-config">
                    <div class="loading">Cargando configuración de horarios...</div>
                </div>
            </div>

            <div id="debug" class="tab-content">
                <h2>🔍 Debug y Tests</h2>
                <button class="btn btn-primary" onclick="testAPI()">🧪 Test API</button>
                <button class="btn btn-warning" onclick="clearDebug()">🗑️ Clear</button>
                <div id="debug-results"></div>
            </div>
        </div>

        <div class="footer">
            <p>© 2025 Chetomi - Panel Admin | <a href="${SHIPPING_API_URL}/health" target="_blank">API Status</a></p>
        </div>
    </div>

    <div id="alerts"></div>

    <script>
        const API_URL = '${SHIPPING_API_URL}';
        let currentConfig = {};

        // Navegación entre pestañas
        function showTab(tabName) {
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(tabName).classList.add('active');
            
            if (tabName === 'dashboard') loadDashboard();
            if (tabName === 'pricing') loadPricing();
            if (tabName === 'schedules') loadSchedules();
        }

        async function loadConfig() {
            try {
                console.log('Loading config from:', API_URL + '/admin/config');
                const response = await fetch(API_URL + '/admin/config');
                
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                }
                
                currentConfig = await response.json();
                console.log('Config loaded:', currentConfig);
            } catch (error) {
                console.error('Config error:', error);
                showAlert('Error cargando configuración: ' + error.message, 'error');
                throw error;
            }
        }

        // ==================== DASHBOARD ====================
        async function loadDashboard() {
            try {
                console.log('Loading dashboard...');
                
                const [healthResponse, statusResponse] = await Promise.all([
                    fetch(API_URL + '/health'),
                    fetch(API_URL + '/admin/service-status')
                ]);
                
                if (!healthResponse.ok || !statusResponse.ok) {
                    throw new Error('API endpoints error');
                }
                
                const health = await healthResponse.json();
                const status = await statusResponse.json();
                
                document.getElementById('dashboard-stats').innerHTML = 
                    '<div class="stat-card"><div class="stat-number">✅</div><div class="stat-label">Sistema Activo</div></div>' +
                    '<div class="stat-card"><div class="stat-number">' + (health.services_enabled || 0) + '</div><div class="stat-label">Servicios Habilitados</div></div>' +
                    '<div class="stat-card"><div class="stat-number">🇨🇱</div><div class="stat-label">Zona: Santiago</div></div>' +
                    '<div class="stat-card"><div class="stat-number">⏰</div><div class="stat-label">' + (status.chile_time || 'N/A') + '</div></div>';
                
                let servicesHtml = '';
                Object.keys(status.services || {}).forEach(serviceCode => {
                    const service = status.services[serviceCode];
                    servicesHtml += 
                        '<div class="service-card ' + (service.enabled ? 'enabled' : 'disabled') + '">' +
                        '<div class="service-title">' + service.name +
                        '<div>' +
                        '<span class="status-badge ' + (service.available_now ? 'available' : 'unavailable') + '">' +
                        (service.available_now ? '🟢 DISPONIBLE' : '🔴 NO DISPONIBLE') + '</span>' +
                        '<span class="status-badge ' + (service.enabled ? 'active' : 'inactive') + '">' +
                        (service.enabled ? 'ACTIVO' : 'INACTIVO') + '</span></div></div>' +
                        '<div class="alert alert-info">⏰ <strong>Hora actual:</strong> ' + service.current_time + '<br>' +
                        '📅 <strong>Horario configurado:</strong> ' + service.schedule + '<br>' +
                        '📋 <strong>Días permitidos:</strong> ' + service.days.map(d => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]).join(', ') + '</div></div>';
                });
                
                document.getElementById('live-status').innerHTML = servicesHtml;
                console.log('Dashboard loaded successfully');
                
            } catch (error) {
                console.error('Dashboard error:', error);
                document.getElementById('dashboard-stats').innerHTML = '<div class="alert alert-error">❌ Error: ' + error.message + '</div>';
            }
        }

        // ==================== PRECIOS ====================
        async function loadPricing() {
            try {
                console.log('Loading pricing...');
                await loadConfig();
                
                const container = document.getElementById('pricing-services');
                container.innerHTML = '';

                Object.keys(currentConfig.services || {}).forEach(serviceCode => {
                    const service = currentConfig.services[serviceCode];
                    const serviceDiv = document.createElement('div');
                    serviceDiv.className = 'service-card ' + (service.enabled ? 'enabled' : 'disabled');
                    
                    let tableHTML = '<table class="pricing-table"><thead><tr><th>Rango</th><th>Desde (km)</th><th>Hasta (km)</th><th>Precio (CLP)</th><th>Acciones</th></tr></thead><tbody>';
                    
                    service.ranges.forEach((range, index) => {
                        const label = range.label || range.min + '-' + (range.max === Infinity ? '∞' : range.max) + ' km';
                        const maxValue = range.max === Infinity ? '999' : range.max;
                        
                        tableHTML += '<tr>';
                        tableHTML += '<td><strong>' + label + '</strong></td>';
                        tableHTML += '<td><input type="number" value="' + range.min + '" min="0" step="0.1" data-service="' + serviceCode + '" data-index="' + index + '" data-field="min" onchange="handleRangeUpdate(this)"></td>';
                        tableHTML += '<td><input type="number" value="' + maxValue + '" min="0" step="0.1" data-service="' + serviceCode + '" data-index="' + index + '" data-field="max" onchange="handleRangeUpdate(this)"></td>';
                        tableHTML += '<td><input type="number" value="' + range.price + '" min="0" step="100" data-service="' + serviceCode + '" data-index="' + index + '" data-field="price" onchange="handleRangeUpdate(this)"></td>';
                        tableHTML += '<td style="text-align: center;"><button class="btn btn-danger" style="padding: 8px 12px; font-size: 12px;" data-service="' + serviceCode + '" data-index="' + index + '" onclick="handleRangeRemove(this)">🗑️</button></td>';
                        tableHTML += '</tr>';
                    });
                    
                    tableHTML += '</tbody></table>';
                    
                    serviceDiv.innerHTML = 
                        '<h3>' + service.name + ' <span class="status-badge ' + (service.enabled ? 'active' : 'inactive') + '">' + (service.enabled ? 'ACTIVO' : 'INACTIVO') + '</span></h3>' +
                        '<div><h4>💰 Rangos de Precios por Kilómetros:</h4>' + tableHTML + '</div>' +
                        '<div style="margin-top: 20px;">' +
                        '<button class="btn btn-success" data-service="' + serviceCode + '" onclick="handleAddRange(this)">➕ Agregar Rango</button>' +
                        '<button class="btn btn-primary" data-service="' + serviceCode + '" onclick="handleSavePricing(this)">💾 Guardar Precios</button>' +
                        '<button class="btn btn-warning" data-service="' + serviceCode + '" onclick="handleResetPricing(this)">🔄 Restablecer</button></div>';
                    
                    container.appendChild(serviceDiv);
                });
                
                console.log('Pricing loaded successfully');
                
            } catch (error) {
                console.error('Pricing error:', error);
                document.getElementById('pricing-services').innerHTML = '<div class="alert alert-error">❌ Error cargando precios: ' + error.message + '</div>';
            }
        }

        function handleRangeUpdate(element) {
            const serviceCode = element.getAttribute('data-service');
            const index = parseInt(element.getAttribute('data-index'));
            const field = element.getAttribute('data-field');
            const value = element.value;
            
            console.log('Updating range:', serviceCode, index, field, value);
            
            if (!currentConfig.services[serviceCode]) return;
            
            const numValue = field === 'max' && value == '999' ? Infinity : parseFloat(value);
            currentConfig.services[serviceCode].ranges[index][field] = numValue;
            
            const range = currentConfig.services[serviceCode].ranges[index];
            const maxLabel = range.max === Infinity ? '∞' : range.max;
            range.label = range.min + '-' + maxLabel + ' km';
            
            showAlert('📝 Rango actualizado: ' + range.label + ' = $' + range.price, 'success');
        }

        function handleAddRange(element) {
            const serviceCode = element.getAttribute('data-service');
            console.log('Adding range to:', serviceCode);
            
            if (!currentConfig.services[serviceCode]) return;
            
            const ranges = currentConfig.services[serviceCode].ranges;
            const lastRange = ranges[ranges.length - 1];
            
            const newMin = lastRange.max === Infinity ? lastRange.min + 5 : lastRange.max;
            const newMax = newMin + 2;
            const newPrice = lastRange.price + 500;
            
            const newRange = {
                min: newMin,
                max: newMax,
                price: newPrice,
                label: newMin + '-' + newMax + ' km'
            };
            
            if (lastRange.max === Infinity) {
                ranges.splice(-1, 0, newRange);
            } else {
                ranges.push(newRange);
            }
            
            loadPricing();
            showAlert('➕ Nuevo rango agregado: ' + newRange.label, 'success');
        }

        function handleRangeRemove(element) {
            const serviceCode = element.getAttribute('data-service');
            const index = parseInt(element.getAttribute('data-index'));
            console.log('Removing range:', serviceCode, index);
            
            if (!currentConfig.services[serviceCode]) return;
            
            const ranges = currentConfig.services[serviceCode].ranges;
            
            if (ranges.length <= 1) {
                showAlert('❌ Debe haber al menos un rango de precios', 'error');
                return;
            }
            
            const removedRange = ranges[index];
            ranges.splice(index, 1);
            
            loadPricing();
            showAlert('🗑️ Rango eliminado: ' + removedRange.label, 'error');
        }

        async function handleSavePricing(element) {
            const serviceCode = element.getAttribute('data-service');
            console.log('Saving pricing for:', serviceCode);
            
            try {
                const response = await fetch(API_URL + '/admin/update-ranges', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        serviceCode, 
                        ranges: currentConfig.services[serviceCode].ranges 
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('✅ Precios de ' + currentConfig.services[serviceCode].name + ' guardados correctamente', 'success');
                } else {
                    showAlert('❌ Error: ' + result.error, 'error');
                }
                
            } catch (error) {
                showAlert('❌ Error guardando: ' + error.message, 'error');
            }
        }

        function handleResetPricing(element) {
            const serviceCode = element.getAttribute('data-service');
            console.log('Resetting pricing for:', serviceCode);
            
            if (!confirm('¿Estás seguro de restablecer los precios de ' + currentConfig.services[serviceCode].name + '?')) {
                return;
            }
            
            const defaultRanges = {
                'TODAY': [
                    { min: 0, max: 2, price: 2500, label: '0-2 km' },
                    { min: 2, max: 4, price: 3000, label: '2-4 km' },
                    { min: 4, max: 6, price: 3500, label: '4-6 km' },
                    { min: 6, max: 8, price: 4000, label: '6-8 km' },
                    { min: 8, max: 10, price: 4500, label: '8-10 km' },
                    { min: 10, max: Infinity, price: 5500, label: '+10 km' }
                ],
                'SCHEDULED': [
                    { min: 0, max: 2, price: 2000, label: '0-2 km' },
                    { min: 2, max: 4, price: 2500, label: '2-4 km' },
                    { min: 4, max: 6, price: 3000, label: '4-6 km' },
                    { min: 6, max: 8, price: 3500, label: '6-8 km' },
                    { min: 8, max: 10, price: 4000, label: '8-10 km' },
                    { min: 10, max: Infinity, price: 4500, label: '+10 km' }
                ]
            };
            
            currentConfig.services[serviceCode].ranges = defaultRanges[serviceCode] || defaultRanges['SCHEDULED'];
            loadPricing();
            showAlert('🔄 Precios de ' + currentConfig.services[serviceCode].name + ' restablecidos', 'success');
        }

        // ==================== HORARIOS ====================
        async function loadSchedules() {
            try {
                console.log('Loading schedules...');
                await loadConfig();
                
                const container = document.getElementById('schedules-config');
                container.innerHTML = '';

                Object.keys(currentConfig.services || {}).forEach(serviceCode => {
                    const service = currentConfig.services[serviceCode];
                    const serviceDiv = document.createElement('div');
                    serviceDiv.className = 'service-card ' + (service.enabled ? 'enabled' : 'disabled');
                    
                    serviceDiv.innerHTML = 
                        '<div class="service-title">⏰ ' + service.name + 
                        '<div>' +
                        '<span class="status-badge ' + (service.enabled ? 'active' : 'inactive') + '">' +
                        (service.enabled ? 'ACTIVO' : 'INACTIVO') + '</span></div></div>' +
                        
                        '<div class="form-group">' +
                        '<label>🕐 Horario de Disponibilidad:</label>' +
                        '<div class="form-grid">' +
                        '<div><label>Desde:</label><input type="time" value="' + service.available_hours.start + '" data-service="' + serviceCode + '" data-field="start" onchange="updateServiceTime(this)"></div>' +
                        '<div><label>Hasta:</label><input type="time" value="' + service.available_hours.end + '" data-service="' + serviceCode + '" data-field="end" onchange="updateServiceTime(this)"></div>' +
                        '</div></div>' +
                        
                        '<div class="form-group">' +
                        '<label>📅 Días de la Semana Disponibles:</label>' +
                        '<div class="days-grid">' +
                        ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, index) => 
                            '<div class="day-checkbox ' + (service.available_days.includes(index) ? 'active' : '') + '" ' +
                            'data-service="' + serviceCode + '" data-day="' + index + '" onclick="toggleDay(this)">' +
                            '<div>' + day + '</div>' +
                            '</div>'
                        ).join('') +
                        '</div></div>' +
                        
                        '<div class="form-group">' +
                        '<label>📝 Configuración de Calendario y Entrega:</label>' +
                        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0;">' +
                        '<label style="display: flex; align-items: center; gap: 10px;">' +
                        '<div class="toggle-switch">' +
                        '<input type="checkbox" ' + (service.show_calendar ? 'checked' : '') + ' data-service="' + serviceCode + '" data-field="show_calendar" onchange="updateServiceBoolean(this)">' +
                        '<span class="slider"></span></div>' +
                        '🗓️ Mostrar calendario al cliente</label>' +
                        '<label style="display: flex; align-items: center; gap: 10px;">' +
                        '<div class="toggle-switch">' +
                        '<input type="checkbox" ' + (service.block_same_day ? 'checked' : '') + ' data-service="' + serviceCode + '" data-field="block_same_day" onchange="updateServiceBoolean(this)">' +
                        '<span class="slider"></span></div>' +
                        '🚫 Bloquear entrega el mismo día</label>' +
                        '</div></div>' +
                        
                        '<div style="margin-top: 20px;">' +
                        '<button class="btn ' + (service.enabled ? 'btn-danger' : 'btn-success') + '" data-service="' + serviceCode + '" onclick="toggleServiceStatus(this)">' +
                        (service.enabled ? '❌ Desactivar' : '✅ Activar') + ' Servicio</button>' +
                        '<button class="btn btn-primary" data-service="' + serviceCode + '" onclick="saveScheduleConfig(this)">💾 Guardar Horarios</button>' +
                        '<button class="btn btn-warning" data-service="' + serviceCode + '" onclick="testServiceAvailability(this)">🧪 Probar Disponibilidad</button>' +
                        '</div>';
                    
                    container.appendChild(serviceDiv);
                });
                
                console.log('Schedules loaded successfully');
            } catch (error) {
                console.error('Schedules error:', error);
                document.getElementById('schedules-config').innerHTML = '<div class="alert alert-error">❌ Error: ' + error.message + '</div>';
            }
        }

        function updateServiceTime(element) {
            const serviceCode = element.getAttribute('data-service');
            const field = element.getAttribute('data-field');
            const value = element.value;
            
            if (!currentConfig.services[serviceCode]) return;
            
            currentConfig.services[serviceCode].available_hours[field] = value;
            console.log('Updated time:', serviceCode, field, value);
            
            const timeLabel = field === 'start' ? 'inicio' : 'fin';
            showAlert('⏰ Horario de ' + timeLabel + ' actualizado: ' + value, 'success');
        }

        function toggleDay(element) {
            const serviceCode = element.getAttribute('data-service');
            const dayIndex = parseInt(element.getAttribute('data-day'));
            
            if (!currentConfig.services[serviceCode]) return;
            
            const service = currentConfig.services[serviceCode];
            const dayNames = ['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados'];
            
            if (service.available_days.includes(dayIndex)) {
                const index = service.available_days.indexOf(dayIndex);
                service.available_days.splice(index, 1);
                element.classList.remove('active');
                showAlert('📅 ' + dayNames[dayIndex] + ' DESACTIVADO para ' + service.name, 'error');
            } else {
                service.available_days.push(dayIndex);
                service.available_days.sort();
                element.classList.add('active');
                showAlert('📅 ' + dayNames[dayIndex] + ' ACTIVADO para ' + service.name, 'success');
            }
            
            console.log('Updated days for', serviceCode, ':', service.available_days);
        }

        function updateServiceBoolean(element) {
            const serviceCode = element.getAttribute('data-service');
            const field = element.getAttribute('data-field');
            const value = element.checked;
            
            if (!currentConfig.services[serviceCode]) return;
            
            currentConfig.services[serviceCode][field] = value;
            console.log('Updated boolean:', serviceCode, field, value);
            
            const fieldNames = {
                'show_calendar': value ? 'Calendario ACTIVADO' : 'Calendario DESACTIVADO',
                'block_same_day': value ? 'Bloqueo mismo día ACTIVADO' : 'Bloqueo mismo día DESACTIVADO'
            };
            
            showAlert('📝 ' + fieldNames[field] + ' para ' + currentConfig.services[serviceCode].name, 'success');
        }

        async function toggleServiceStatus(element) {
            const serviceCode = element.getAttribute('data-service');
            
            try {
                const response = await fetch(API_URL + '/admin/toggle-service', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ serviceCode })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('✅ ' + result.message, 'success');
                    loadSchedules();
                    loadDashboard();
                } else {
                    showAlert('❌ Error: ' + result.error, 'error');
                }
                
            } catch (error) {
                showAlert('❌ Error: ' + error.message, 'error');
            }
        }

        async function saveScheduleConfig(element) {
            const serviceCode = element.getAttribute('data-service');
            
            try {
                const service = currentConfig.services[serviceCode];
                
                const response = await fetch(API_URL + '/admin/update-service-hours', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        serviceCode,
                        startTime: service.available_hours.start,
                        endTime: service.available_hours.end,
                        availableDays: service.available_days
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('✅ Configuración de ' + service.name + ' guardada correctamente', 'success');
                    loadDashboard();
                } else {
                    showAlert('❌ Error: ' + result.error, 'error');
                }
                
            } catch (error) {
                showAlert('❌ Error: ' + error.message, 'error');
            }
        }

        async function testServiceAvailability(element) {
            const serviceCode = element.getAttribute('data-service');
            
            try {
                const response = await fetch(API_URL + '/admin/service-status');
                const status = await response.json();
                const serviceStatus = status.services[serviceCode];
                
                const message = 
                    '🧪 <strong>Test - ' + serviceStatus.name + '</strong><br><br>' +
                    '⏰ <strong>Hora Chile:</strong> ' + status.chile_time + '<br>' +
                    '📋 <strong>Estado:</strong> ' + (serviceStatus.enabled ? '✅ Activo' : '❌ Inactivo') + '<br>' +
                    '🕐 <strong>Horario:</strong> ' + serviceStatus.schedule + '<br>' +
                    '📅 <strong>Días:</strong> ' + serviceStatus.days.map(d => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]).join(', ') + '<br>' +
                    '🎯 <strong>¿Disponible AHORA?</strong> ' + (serviceStatus.available_now ? '✅ SÍ' : '❌ NO');
                
                showAlert(message, serviceStatus.available_now ? 'success' : 'error');
                
            } catch (error) {
                showAlert('❌ Error: ' + error.message, 'error');
            }
        }

        // ==================== DEBUG ====================
        async function testAPI() {
            const resultsDiv = document.getElementById('debug-results');
            resultsDiv.innerHTML = '<div class="loading">Testing API...</div>';
            
            try {
                const response = await fetch(API_URL + '/health');
                const data = await response.json();
                resultsDiv.innerHTML = '<div class="alert alert-success">✅ API OK: ' + JSON.stringify(data, null, 2) + '</div>';
            } catch (error) {
                resultsDiv.innerHTML = '<div class="alert alert-error">❌ API Error: ' + error.message + '</div>';
            }
        }

        function clearDebug() {
            document.getElementById('debug-results').innerHTML = '';
        }

        // ==================== UTILIDADES ====================
        function showAlert(message, type) {
            console.log('Alert:', type, message);
            const alertsDiv = document.getElementById('alerts');
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-' + type;
            alertDiv.innerHTML = message;
            alertDiv.style.position = 'fixed';
            alertDiv.style.top = '20px';
            alertDiv.style.right = '20px';
            alertDiv.style.zIndex = '9999';
            alertDiv.style.maxWidth = '500px';
            alertDiv.style.borderRadius = '8px';
            alertDiv.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            
            alertsDiv.appendChild(alertDiv);
            
            setTimeout(function() {
                alertDiv.remove();
            }, 5000);
        }

        // ==================== INICIALIZACIÓN ====================
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Admin panel loaded, API URL:', API_URL);
            loadDashboard();
        });

        window.addEventListener('error', function(e) {
            console.error('JavaScript error:', e.error);
            showAlert('💥 Error JS: ' + e.error.message, 'error');
        });
    </script>
</body>
</html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔧 CHETOMI ADMIN PANEL - VERSIÓN CORREGIDA`);
  console.log(`🌐 Puerto: ${PORT}`);
  console.log(`🔗 URL: https://admin.chetomi.cl`);
  console.log(`📡 API Principal: ${SHIPPING_API_URL}`);
  console.log(`🔑 Usuario: chetomi / Contraseña: admin123`);
  console.log(`=====================================`);
});
