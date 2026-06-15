async function testToken() {
  try {
    const url = 'https://g-poc-v3.vercel.app/api/telephony/token';
    console.log("Fetching token from:", url);
    const res = await fetch(url);
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response Body:", text);
  } catch (error) {
    console.error("Test token request failed:", error.message);
  }
}

testToken();
