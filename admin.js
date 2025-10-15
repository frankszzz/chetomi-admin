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

// PÁGINA PRINCIPAL
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
        .service-card:hover { 
            box-shadow: 0 8px 25px rgba(0,0,0,0.1); 
            transform: translateY(-2px);
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
        .form-group { margin: 20px 0; }
        .form-group label { 
            display: block; 
            margin-bottom: 8px; 
            font-weight: 600; 
            color: #495057; 
        }
        .form-group input, .form-group select, .form-group textarea {
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
            padding: 8px;
            border: 1px solid #ced4da;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .day-checkbox.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
        }
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
            <button class="nav-item" onclick="showTab('services')">⚙️ Servicios</button>
            <button class="nav-item" onclick="showTab('settings')">🔧 Configuración</button>
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
                <h2>⏰ Configuración de Horarios y Días</h2>
                <div id="schedules-config">
                    <div class="loading">Cargando configuración de horarios...</div>
                </div>
            </div>

            <div id="services" class="tab-content">
                <h2>⚙️ Configuración Avanzada de Servicios</h2>
                <div id="services-advanced">
                    <div class="loading">Cargando servicios...</div>
                </div>
            </div>

            <div id="settings" class="tab-content">
                <h2>🔧 Configuración General del Sistema</h2>
                <div id="general-settings">
                    <div class="loading">Cargando configuración...</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>© 2025 Chetomi - Panel de Administración de Envíos | 
               <a href="${SHIPPING_API_URL}/health" target="_blank">Estado API</a> |
               <a href="${SHIPPING_API_URL}/admin/service-status" target="_blank">Estado en Vivo</a>
            </p>
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
            if (tabName === 'services') loadAdvancedServices();
            if (tabName === 'settings') loadSettings();
        }

        async function loadConfig() {
            try {
                const response = await fetch(API_URL + '/admin/config');
                currentConfig = await response.json();
            } catch (error) {
                showAlert('Error cargando configuración: ' + error.message, 'error');
            }
        }

        // DASHBOARD
        async function loadDashboard() {
            try {
                const [healthResponse, statusResponse] = await Promise.all([
                    fetch(API_URL + '/health'),
                    fetch(API_URL + '/admin/service-status')
                ]);
                
                const health = await healthResponse.json();
                const status = await statusResponse.json();
                
                document.getElementById('dashboard-stats').innerHTML = 
                    '<div class="stat-card"><div class="stat-number">✅</div><div class="stat-label">Sistema Activo</div></div>' +
                    '<div class="stat-card"><div class="stat-number">' + (health.services_enabled || 0) + '</div><div class="stat-label">Servicios Habilitados</div></div>' +
                    '<div class="stat-card"><div class="stat-number">🇨🇱</div><div class="stat-label">Zona: Santiago</div></div>' +
                    '<div class="stat-card"><div class="stat-number">⏰</div><div class="stat-label">' + (status.chile_time || 'N/A') + '</div></div>';
                
                let servicesHtml = '';
                Object.keys(status.services).forEach(serviceCode => {
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
                
            } catch (error) {
                document.getElementById('dashboard-stats').innerHTML = '<div class="alert alert-error">❌ Error conectando con la API: ' + error.message + '</div>';
            }
        }

        // PRECIOS
        async function loadPricing() {
            await loadConfig();
            const container = document.getElementById('pricing-services');
            container.innerHTML = '';

            Object.keys(currentConfig.services).forEach(serviceCode => {
                const service = currentConfig.services[serviceCode];
                const serviceDiv = document.createElement('div');
                serviceDiv.className = 'service-card ' + (service.enabled ? 'enabled' : 'disabled');
                
                let rangesHtml = '';
                service.ranges.forEach((range, index) => {
                    const label = range.label || range.min + '-' + (range.max === Infinity ? '∞' : range.max) + ' km';
                    const maxValue = range.max === Infinity ? '999' : range.max;
                    rangesHtml += 
                        '<tr>' +
                        '<td><strong>' + label + '</strong></td>' +
                        '<td><input type="number" value="' + range.min + '" min="0" step="0.1" onchange="updateRange(\'' + serviceCode + '\', ' + index + ', \'min\', this.value)"></td>' +
                        '<td><input type="number" value="' + maxValue + '" min="0" step="0.1" onchange="updateRange(\'' + serviceCode + '\', ' + index + ', \'max\', this.value)"></td>' +
                        '<td><input type="number" value="' + range.price + '" min="0" step="100" onchange="updateRange(\'' + serviceCode + '\', ' + index + ', \'price\', this.value)"></td>' +
                        '<td style="text-align: center;"><button class="btn btn-danger" onclick="removeRange(\'' + serviceCode + '\', ' + index + ')" style="padding: 8px 12px; font-size: 12px;">🗑️</button></td>' +
                        '</tr>';
                });
                
                serviceDiv.innerHTML = 
                    '<h3>' + service.name + ' <span class="status-badge ' + (service.enabled ? 'active' : 'inactive') + '">' + (service.enabled ? 'ACTIVO' : 'INACTIVO') + '</span></h3>' +
                    '<div><h4>💰 Rangos de Precios por Kilómetros:</h4>' +
                    '<table class="pricing-table"><thead><tr><th>Rango</th><th>Desde (km)</th><th>Hasta (km)</th><th>Precio (CLP)</th><th>Acciones</th></tr></thead>' +
                    '<tbody>' + rangesHtml + '</tbody></table></div>' +
                    '<div style="margin-top: 20px;">' +
                    '<button class="btn btn-success" onclick="addRange(\'' + serviceCode + '\')">➕ Agregar Rango</button>' +
                    '<button class="btn btn-primary" onclick="savePricing(\'' + serviceCode + '\')">💾 Guardar Precios</button>' +
                    '<button class="btn btn-warning" onclick="resetPricing(\'' + serviceCode + '\')">🔄 Restablecer</button></div>';
                
                container.appendChild(serviceDiv);
            });
        }

        // FUNCIONES DE PRECIOS
        async function updateRange(serviceCode, rangeIndex, field, value) {
            if (!currentConfig.services[serviceCode]) return;
            
            const numValue = field === 'max' && value == '999' ? Infinity : parseFloat(value);
            currentConfig.services[serviceCode].ranges[rangeIndex][field] = numValue;
            
            const range = currentConfig.services[serviceCode].ranges[rangeIndex];
            const maxLabel = range.max === Infinity ? '∞' : range.max;
            range.label = range.min + '-' + maxLabel + ' km';
            
            showAlert('📝 Rango actualizado: ' + range.label + ' = $' + range.price, 'success');
        }

        async function addRange(serviceCode) {
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

        async function removeRange(serviceCode, rangeIndex) {
            if (!currentConfig.services[serviceCode]) return;
            
            const ranges = currentConfig.services[serviceCode].ranges;
            
            if (ranges.length <= 1) {
                showAlert('❌ Debe haber al menos un rango de precios', 'error');
                return;
            }
            
            const removedRange = ranges[rangeIndex];
            ranges.splice(rangeIndex, 1);
            
            loadPricing();
            showAlert('🗑️ Rango eliminado: ' + removedRange.label, 'error');
        }

        async function savePricing(serviceCode) {
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
                    showAlert('❌ Error guardando precios: ' + result.error, 'error');
                }
                
            } catch (error) {
                showAlert('❌ Error guardando precios: ' + error.message, 'error');
            }
        }

        async function resetPricing(serviceCode) {
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

        // OTRAS FUNCIONES
        async function loadSchedules() {
            document.getElementById('schedules-config').innerHTML = '<div class="alert alert-info">🚧 Interfaz de horarios próximamente disponible</div>';
        }

        async function loadAdvancedServices() {
            document.getElementById('services-advanced').innerHTML = '<div class="alert alert-info">🚧 Configuraciones avanzadas próximamente</div>';
        }

        async function loadSettings() {
            document.getElementById('general-settings').innerHTML = '<div class="alert alert-info"><h4>🔧 Configuración General</h4><p><strong>API URL:</strong> ' + API_URL + '</p><p><strong>Zona Horaria:</strong> America/Santiago</p><p><strong>Estado:</strong> Sistema funcionando correctamente</p></div>';
        }

        // Función para mostrar alertas
        function showAlert(message, type) {
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
            }, 7000);
        }

        // Auto-actualizar dashboard cada 30 segundos
        setInterval(loadDashboard, 30000);

        // Inicializar
        document.addEventListener('DOMContentLoaded', function() {
            loadDashboard();
        });
    </script>
</body>
</html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔧 CHETOMI ADMIN PANEL FUNCIONANDO`);
  console.log(`🌐 Puerto: ${PORT}`);
  console.log(`🔗 URL: https://admin.chetomi.cl`);
  console.log(`📡 API Principal: ${SHIPPING_API_URL}`);
  console.log(`🔐 Usuario: chetomi / Contraseña: admin123`);
  console.log(`=====================================`);
});
