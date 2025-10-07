const http = require("http");

console.log("Testing dashboard performance...");

const start = Date.now();

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/reports/dashboard",
  method: "GET",
  headers: {
    Authorization:
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AY2x5bmVwYXBlci5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3Mzc5OTQ5ODksImV4cCI6MTczNzk5ODU4OX0.LoE5s5FfXO7FW9qJUgKlE0t_LqVdSSyDXu-3pzfEKYc",
  },
};

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    const end = Date.now();
    const responseTime = end - start;

    console.log("=".repeat(50));
    console.log("Dashboard Performance Test Results:");
    console.log("=".repeat(50));
    console.log("Response Time:", responseTime, "ms");
    console.log("Status Code:", res.statusCode);

    if (res.statusCode === 200) {
      try {
        const jsonData = JSON.parse(data);
        console.log("Success: Dashboard data retrieved");
        console.log("Data structure:", Object.keys(jsonData.data || jsonData));

        if (responseTime < 200) {
          console.log("✅ EXCELLENT: Sub-200ms response time!");
        } else if (responseTime < 500) {
          console.log("✅ GOOD: Sub-500ms response time");
        } else if (responseTime < 1000) {
          console.log("⚠️  FAIR: Sub-1s response time");
        } else {
          console.log("❌ SLOW: Over 1 second response time");
        }
      } catch (e) {
        console.log("❌ Error parsing JSON response");
        console.log("Response preview:", data.substring(0, 300));
      }
    } else {
      console.log("❌ Error:", res.statusCode);
      console.log("Response:", data);
    }
    console.log("=".repeat(50));
  });
});

req.on("error", (err) => {
  console.error("Request error:", err.message);
});

req.end();
