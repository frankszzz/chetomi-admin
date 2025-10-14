require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

// URL de la API principal de envíos
const SHIPPING_API_URL = process.env.SHIPPING_API_URL || 'https://envio.chetomi.cl';

app.use(express.json());
app.use(cors());

// MIDDLEWARE DE AUTENTICACIÓN BÁSICA
app.use((req, res, next) => {
  // Solo proteger rutas que no sean de la API principal
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

// PÁGINA PRINCIPAL DEL ADMIN
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
            max-width: 1200px; 
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
            <p>Gestión de Envíos - Chetomi</p>
        </div>

        <div class="nav">
            <button class="nav-item active" onclick="showTab('dashboard')">📊 Dashboard</button>
            <button class="nav-item" onclick="showTab('pricing')">💰 Precios</button>
            <button class="nav-item" onclick="showTab('services')">⚙️ Servicios</button>
            <button class="nav-item" onclick="showTab('settings')">🔧 Configuración</button>
        </div>

        <div class="content">
            <div id="dashboard" class="tab-content active">
                <h2>📊 Dashboard General</h2>
                <div id="dashboard-stats" class="stats-grid">
                    <div class="loading">Cargando estadísticas...</div>
                </div>
                
                <div id="recent-activity">
                    <h3>Actividad Reciente</h3>
                    <div class="alert alert-info">
                        ✅ Sistema de envíos funcionando correctamente<br>
                        🌐 API conectada: <a href="${SHIPPING_API_URL}" target="_blank">${SHIPPING_API_URL}</a><br>
                        ⏱️ Última actualización: <span id="last-update"></span>
                    </div>
                </div>
            </div>

            <div id="pricing" class="tab-content">
                <h2>💰 Gestión de Precios por Kilómetros</h2>
                <div id="pricing-services">
                    <div class="loading">Cargando configuración de precios...</div>
                </div>
            </div>

            <div id="services" class="tab-content">
                <h2>⚙️ Configuración de Servicios</h2>
                <div id="services-config">
                    <div class="loading">Cargando servicios...</div>
                </div>
            </div>

            <div id="settings" class="tab-content">
                <h2>🔧 Configuración General</h2>
                <div class="form-group">
                    <label>URL de la API de Envíos:</label>
                    <input type="url" id="api-url" value="${SHIPPING_API_URL}" readonly>
                    <small>Esta es la URL que usa JumpSeller para calcular envíos</small>
                </div>
                
                <div class="form-group">
                    <label>Estado del Sistema:</label>
                    <div id="system-status" class="alert alert-info">
                        Verificando conexión...
                    </div>
                </div>

                <button class="btn btn-primary" onclick="testConnection()">🔍 Probar Conexión</button>
                <button class="btn btn-success" onclick="exportConfig()">📥 Exportar Configuración</button>
            </div>
        </div>

        <div class="footer">
            <p>© 2025 Chetomi - Panel de Administración de Envíos | 
               <a href="${SHIPPING_API_URL}/health" target="_blank">Estado API</a>
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
            
            // Cargar contenido específico
            if (tabName === 'dashboard') loadDashboard();
            if (tabName === 'pricing') loadPricing();
            if (tabName === 'services') loadServices();
            if (tabName === 'settings') loadSettings();
        }

        // Cargar dashboard
        async function loadDashboard() {
            try {
                const response = await fetch(API_URL + '/health');
                const health = await response.json();
                
                document.getElementById('dashboard-stats').innerHTML = \`
                    <div class="stat-card">
                        <div class="stat-number">✅</div>
                        <div class="stat-label">Sistema Activo</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${health.services_enabled || 'N/A'}</div>
                        <div class="stat-label">Servicios Habilitados</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">24/7</div>
                        <div class="stat-label">Disponibilidad</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">🚀</div>
                        <div class="stat-label">Estado API</div>
                    </div>
                \`;
                
                document.getElementById('last-update').textContent = new Date().toLocaleString();
                
            } catch (error) {
                document.getElementById('dashboard-stats').innerHTML = \`
                    <div class="alert alert-error">
                        ❌ Error conectando con la API: \${error.message}
                    </div>
                \`;
            }
        }

        // Cargar configuración de precios
        async function loadPricing() {
            try {
                const response = await fetch(API_URL + '/admin/config');
                currentConfig = await response.json();
                
                const pricingDiv = document.getElementById('pricing-services');
                pricingDiv.innerHTML = '';
                
                Object.keys(currentConfig.services).forEach(serviceCode => {
                    const service = currentConfig.services[serviceCode];
                    const serviceDiv = document.createElement('div');
                    serviceDiv.className = \`service-card \${service.enabled ? 'enabled' : 'disabled'}\`;
                    
                    serviceDiv.innerHTML = \`
                        <div class="service-title">
                            \${service.name}
                            <span class="status-badge \${service.enabled ? 'active' : 'inactive'}">
                                \${service.enabled ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                        </div>
                        
                        <table class="pricing-table">
                            <thead>
                                <tr>
                                    <th>Rango (km)</th>
                                    <th>Desde</th>
                                    <th>Hasta</th>
                                    <th>Precio (CLP)</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                \${service.ranges.map((range, index) => \`
                                    <tr>
                                        <td><strong>\${range.label || range.min + '-' + (range.max === Infinity ? '∞' : range.max) + ' km'}</strong></td>
                                        <td><input type="number" value="\${range.min}" min="0" step="0.1" onchange="updateRange('\${serviceCode}', \${index}, 'min', this.value)"></td>
                                        <td><input type="number" value="\${range.max === Infinity ? '999' : range.max}" min="0" step="0.1" onchange="updateRange('\${serviceCode}', \${index}, 'max', this.value)"></td>
                                        <td><input type="number" value="\${range.price}" min="0" step="100" onchange="updateRange('\${serviceCode}', \${index}, 'price', this.value)"></td>
                                        <td>
                                            <button class="btn btn-danger" onclick="removeRange('\${serviceCode}', \${index})">🗑️</button>
                                        </td>
                                    </tr>
                                \`).join('')}
                            </tbody>
                        </table>
                        
                        <button class="btn btn-success" onclick="addRange('\${serviceCode}')">➕ Agregar Rango</button>
                        <button class="btn btn-primary" onclick="saveRanges('\${serviceCode}')">💾 Guardar Cambios</button>
                    \`;
                    
                    pricingDiv.appendChild(serviceDiv);
                });
                
            } catch (error) {
                document.getElementById('pricing-services').innerHTML = \`
                    <div class="alert alert-error">
                        ❌ Error cargando precios: \${error.message}
                    </div>
                \`;
            }
        }

        // Actualizar rango de precio
        function updateRange(serviceCode, rangeIndex, field, value) {
            if (!currentConfig.services[serviceCode]) return;
            
            const numValue = field === 'max' && value == '999' ? Infinity : parseFloat(value);
            currentConfig.services[serviceCode].ranges[rangeIndex][field] = numValue;
            
            // Actualizar label
            const range = currentConfig.services[serviceCode].ranges[rangeIndex];
            const maxLabel = range.max === Infinity ? '∞' : range.max;
            range.label = \`\${range.min}-\${maxLabel} km\`;
        }

        // Agregar nuevo rango
        function addRange(serviceCode) {
            const ranges = currentConfig.services[serviceCode].ranges;
            const lastRange = ranges[ranges.length - 1];
            
            const newRange = {
                min: lastRange.max === Infinity ? lastRange.min + 5 : lastRange.max,
                max: lastRange.max === Infinity ? Infinity : lastRange.max + 2,
                price: lastRange.price + 500,
                label: 'Nuevo rango'
            };
            
            ranges.splice(-1, 0, newRange);
            loadPricing();
        }

        // Eliminar rango
        function removeRange(serviceCode, rangeIndex) {
            if (currentConfig.services[serviceCode].ranges.length <= 1) {
                showAlert('Debe haber al menos un rango de precios', 'error');
                return;
            }
            
            currentConfig.services[serviceCode].ranges.splice(rangeIndex, 1);
            loadPricing();
        }

        // Guardar rangos de un servicio
        async function saveRanges(serviceCode) {
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
                    showAlert(\`✅ Precios de \${currentConfig.services[serviceCode].name} guardados correctamente\`, 'success');
                } else {
                    showAlert('❌ Error guardando precios: ' + result.error, 'error');
                }
                
            } catch (error) {
                showAlert('❌ Error guardando precios: ' + error.message, 'error');
            }
        }

        // Cargar servicios
        function loadServices() {
            document.getElementById('services-config').innerHTML = \`
                <div class="alert alert-info">
                    <h4>🔧 Configuración de Servicios</h4>
                    <p>Funcionalidad en desarrollo. Por ahora puedes:</p>
                    <ul>
                        <li>✅ Modificar precios desde la pestaña "Precios"</li>
                        <li>✅ Ver estado del sistema en "Dashboard"</li>
                        <li>⏳ Configuración avanzada próximamente</li>
                    </ul>
                </div>
            \`;
        }

        // Cargar configuración
        function loadSettings() {
            document.getElementById('system-status').innerHTML = '🔄 Verificando conexión...';
            testConnection();
        }

        // Probar conexión con la API
        async function testConnection() {
            try {
                const response = await fetch(API_URL + '/health');
                const health = await response.json();
                
                document.getElementById('system-status').innerHTML = \`
                    <div class="alert alert-success">
                        ✅ <strong>Conexión exitosa</strong><br>
                        📍 Tienda: \${health.store}<br>
                        ⏰ Timestamp: \${health.timestamp}<br>
                        🔗 API URL: <a href="\${API_URL}" target="_blank">\${API_URL}</a>
                    </div>
                \`;
                
            } catch (error) {
                document.getElementById('system-status').innerHTML = \`
                    <div class="alert alert-error">
                        ❌ <strong>Error de conexión</strong><br>
                        Mensaje: \${error.message}<br>
                        Verifica que la API esté funcionando en: <a href="\${API_URL}" target="_blank">\${API_URL}</a>
                    </div>
                \`;
            }
        }

        // Exportar configuración
        function exportConfig() {
            if (!currentConfig.services) {
                showAlert('❌ No hay configuración para exportar', 'error');
                return;
            }
            
            const dataStr = JSON.stringify(currentConfig, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'chetomi-shipping-config.json';
            link.click();
            
            showAlert('✅ Configuración exportada correctamente', 'success');
        }

        // Mostrar alertas
        function showAlert(message, type) {
            const alertsDiv = document.getElementById('alerts');
            const alertDiv = document.createElement('div');
            alertDiv.className = \`alert alert-\${type}\`;
            alertDiv.innerHTML = message;
            alertDiv.style.position = 'fixed';
            alertDiv.style.top = '20px';
            alertDiv.style.right = '20px';
            alertDiv.style.zIndex = '9999';
            alertDiv.style.maxWidth = '400px';
            alertDiv.style.borderRadius = '8px';
            alertDiv.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            
            alertsDiv.appendChild(alertDiv);
            
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }

        // Inicializar dashboard al cargar
        document.addEventListener('DOMContentLoaded', function() {
            loadDashboard();
            
            // Actualizar timestamp cada minuto
            setInterval(() => {
                document.getElementById('last-update').textContent = new Date().toLocaleString();
            }, 60000);
        });
    </script>
</body>
</html>
  `);
});

// PROXY ENDPOINTS PARA COMUNICARSE CON LA API PRINCIPAL
app.get('/api-proxy/*', async (req, res) => {
  try {
    const apiPath = req.path.replace('/api-proxy', '');
    const response = await axios.get(SHIPPING_API_URL + apiPath);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api-proxy/*', async (req, res) => {
  try {
    const apiPath = req.path.replace('/api-proxy', '');
    const response = await axios.post(SHIPPING_API_URL + apiPath, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check del panel admin
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Chetomi Admin Panel',
    api_url: SHIPPING_API_URL,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔧 CHETOMI ADMIN PANEL INICIADO`);
  console.log(`🌐 Puerto: ${PORT}`);
  console.log(`🔗 URL: https://admin.chetomi.cl`);
  console.log(`📡 API Principal: ${SHIPPING_API_URL}`);
  console.log(`🔐 Usuario: chetomi / Contraseña: admin123`);
  console.log(`=====================================`);
});
