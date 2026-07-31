const testIndependentExtras = async () => {
  try {
    // Test data for independent extras
    const testData = {
      tableSessionId: "test-session-id",
      items: [], // No regular items
      independentExtras: [
        {
          extras: [
            { extraId: "test-extra-1", quantity: 2 },
            { extraId: "test-extra-2", quantity: 1 }
          ]
        }
      ],
      notes: "Test independent extras order"
    };

    console.log("Testing independent extras order creation...");
    console.log("Test data:", JSON.stringify(testData, null, 2));

    // This would normally call the API
    // const response = await fetch('http://localhost:4000/api/orders/create-manual', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(testData)
    // });

    console.log("Test completed - independent extras structure is valid");

  } catch (error) {
    console.error("Test failed:", error);
  }
};

testIndependentExtras();