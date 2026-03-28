const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    server: 'localhost',
    port: 1433,
    database: process.env.DB_NAME || 'RailwayManagementSystem',
    user: 'railway_user',
    password: 'Railway@123',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000
    }
};

let pool = null;

async function getConnection() {
    try {
        if (!pool) {
            console.log('📊 Connecting to SQL Server...');
            console.log(`   Server: ${dbConfig.server}`);
            console.log(`   Database: ${dbConfig.database}`);
            pool = await sql.connect(dbConfig);
            console.log('✅ Database connected successfully');
        }
        return pool;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('\n💡 Troubleshooting:');
        console.error('1. Make sure SQL Server Express is running');
        console.error('2. Make sure SQL Server Browser service is running');
        console.error('3. Check server name is correct: localhost\\SQLEXPRESS');
        throw error;
    }
}

async function executeQuery(query, params = []) {
    const connection = await getConnection();
    const request = connection.request();
    params.forEach((param, index) => {
        request.input(`param${index}`, param);
    });
    return await request.query(query);
}

async function executeProcedure(procedureName, params = {}) {
    const connection = await getConnection();
    const request = connection.request();
    Object.keys(params).forEach(key => {
        request.input(key, params[key]);
    });
    return await request.execute(procedureName);
}

module.exports = { getConnection, executeQuery, executeProcedure, sql };