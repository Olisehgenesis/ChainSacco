const { ethers } = require("ethers");

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);

// Simple storage for our Chain Sacco application
let jointSavings = 0;
let circularSavings = [];
let currentCircularSavingsIndex = 0;

async function handle_advance(data) {
  console.log("Received advance request data " + JSON.stringify(data));

  const { payload } = data;
  const input = JSON.parse(payload);

  switch (input.method) {
    case "depositJointSavings":
      jointSavings += input.amount;
      return `Deposited ${input.amount} to joint savings. New balance: ${jointSavings}`;

    case "makeJointPayment":
      if (jointSavings >= input.amount) {
        jointSavings -= input.amount;
        return `Made joint payment of ${input.amount}. Remaining balance: ${jointSavings}`;
      } else {
        return "Insufficient funds for joint payment";
      }

    case "addToCircularSavings":
      circularSavings.push(input.member);
      return `Added ${input.member} to circular savings group`;

    case "rotateCircularSavings":
      if (circularSavings.length > 0) {
        currentCircularSavingsIndex = (currentCircularSavingsIndex + 1) % circularSavings.length;
        return `This week's recipient: ${circularSavings[currentCircularSavingsIndex]}`;
      } else {
        return "No members in circular savings group";
      }

    default:
      return "Unknown method";
  }
}

async function handle_inspect(data) {
  console.log("Received inspect request data " + JSON.stringify(data));

  const { payload } = data;
  const input = JSON.parse(payload);

  switch (input.method) {
    case "getJointSavingsBalance":
      return `Joint savings balance: ${jointSavings}`;

    case "getCircularSavingsMembers":
      return `Circular savings members: ${circularSavings.join(", ")}`;

    case "getCurrentCircularSavingsRecipient":
      if (circularSavings.length > 0) {
        return `Current recipient: ${circularSavings[currentCircularSavingsIndex]}`;
      } else {
        return "No members in circular savings group";
      }

    default:
      return "Unknown method";
  }
}

var handlers = {
  advance_state: handle_advance,
  inspect_state: handle_inspect,
};

var finish = { status: "accept" };

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      var handler = handlers[rollup_req["request_type"]];
      finish["status"] = await handler(rollup_req["data"]);
    }
  }
})();