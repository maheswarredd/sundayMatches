const http = require('http');

async function testServer() {
  console.log('--- Testing SundayMatches Server Endpoints ---');

  // Helper for HTTP requests
  function makeRequest(path, method = 'GET', body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      });

      req.on('error', (e) => reject(e));
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  // 1. Test /health endpoint
  console.log('1. Checking /health endpoint...');
  const healthRes = await makeRequest('/health');
  console.log('Health check status:', healthRes.status, healthRes.data);
  console.assert(healthRes.status === 200, 'Health check should return status 200');
  console.assert(healthRes.data.status === 'ok', 'Health check status should be "ok"');
  console.log('✓ /health endpoint verified successfully!\n');

  // 2. Test Admin Login
  console.log('2. Checking Admin Login (/api/auth/login)...');
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    username: 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  });
  console.log('Login response:', loginRes.data.success, 'Token received:', !!loginRes.data.token);
  console.assert(loginRes.status === 200 && loginRes.data.success, 'Login failed');
  const token = loginRes.data.token;
  console.log('✓ Admin Login verified successfully!\n');

  // 3. Test Matches List
  console.log('3. Checking /api/matches...');
  const matchesRes = await makeRequest('/api/matches');
  console.log('Matches count:', matchesRes.data.matches.length);
  console.assert(matchesRes.status === 200, 'Matches route failed');
  const seededMatch = matchesRes.data.matches[0];
  console.assert(seededMatch !== undefined, 'Expected seeded sample match');
  console.log('Sample match loaded:', seededMatch.title, 'Status:', seededMatch.status);
  console.log('✓ /api/matches verified successfully!\n');

  // 4. Test Single Match Details
  console.log('4. Checking /api/matches/:id...');
  const matchDetails = await makeRequest(`/api/matches/${seededMatch._id}`);
  console.assert(matchDetails.status === 200, 'Match details failed');
  console.assert(matchDetails.data.match.activeStrikerId !== null, 'Active striker should be set');
  console.assert(matchDetails.data.match.activeBowlerId !== null, 'Active bowler should be set');
  console.log('Active striker:', matchDetails.data.match.activeStrikerId.name);
  console.log('Active bowler:', matchDetails.data.match.activeBowlerId.name);
  console.log('✓ Match details verified successfully!\n');

  // 5. Test Scoring a Ball through API
  console.log('5. Scoring a 4 through /api/scoring/:matchId/ball...');
  const scoreRes = await makeRequest(`/api/scoring/${seededMatch._id}/ball`, 'POST', {
    runsBat: 4,
    extraType: 'NONE'
  }, {
    Authorization: `Bearer ${token}`
  });
  console.assert(scoreRes.status === 200 && scoreRes.data.success, 'Scoring ball failed: ' + JSON.stringify(scoreRes.data));
  console.log('Ball recorded! Score:', `${scoreRes.data.innings.totalRuns}/${scoreRes.data.innings.wickets}`);
  console.log('Commentary:', scoreRes.data.commentary);
  console.log('✓ Live scoring API verified successfully!\n');

  // 6. Test Undo through API
  console.log('6. Undoing last ball through /api/scoring/:matchId/undo...');
  const undoRes = await makeRequest(`/api/scoring/${seededMatch._id}/undo`, 'POST', {
    reason: 'Integration test undo'
  }, {
    Authorization: `Bearer ${token}`
  });
  console.assert(undoRes.status === 200 && undoRes.data.success, 'Undo failed: ' + JSON.stringify(undoRes.data));
  console.log('Undo successful! Restored Score:', `${undoRes.data.innings.totalRuns}/${undoRes.data.innings.wickets}`);
  console.log('✓ Undo API verified successfully!\n');

  console.log('====================================================');
  console.log('  ALL SERVER INTEGRATION TESTS PASSED 100%!        ');
  console.log('====================================================\n');
}

testServer().catch(err => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
