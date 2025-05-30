const axios = require('axios');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const swapTokens2 = async (tokenIn, tokenOut, amountIn, from, origin) => {
    // Permanent exclusions that will always be in the list
    const permanentExclusions = ["ARBITRUM_PMM11", "ARBITRUM_WOOFI_V2"];
    let excludedProtocols = [...permanentExclusions];
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
        await sleep(1000);
        
        console.log("_______________________________________________");
        console.log(`Attempt ${attempts + 1} with excluded protocols:`, excludedProtocols);
        
        const url = "https://api.1inch.dev/swap/v6.0/42161/swap";
        const config = {
            headers: {
                "Authorization": "Bearer ZTBzxUkHaRg6SqbbejNVVcpTphkh8c8u"
            },
            params: {
                "src": tokenIn,
                "dst": tokenOut,
                "amount": amountIn,
                "from": from,
                "origin": origin,
                "slippage": "1",
                "includeProtocols": "true",
                "excludedProtocols": excludedProtocols.join(", "),
                "allowPartialFill": "false",
                "disableEstimate": "true",
                "compatibility": "true"
            },
            paramsSerializer: {
                indexes: null
            }
        };

        try {
            const response = await axios.get(url, config);
            if (response.data && response.data.tx && response.data.tx.data) {
                console.log("Successful protocol:", response.data.protocols[0][0][0].name);
                return response.data.tx.data;
            }
        } catch (error) {
            console.error("Error details:", error.response?.data);
            
            if (error.response?.data?.description) {
                const errorMsg = error.response.data.description;
                const protocolMatch = errorMsg.match(/(\w+_\w+(_V\d)?)/);
                if (protocolMatch && protocolMatch[0]) {
                    const failedProtocol = `ARBITRUM_${protocolMatch[0]}`;
                    if (!excludedProtocols.includes(failedProtocol)) {
                        console.log(`Adding ${failedProtocol} to excluded protocols`);
                        excludedProtocols.push(failedProtocol);
                    }
                }
            }
            
            attempts++;
            if (attempts === maxAttempts) {
                console.error("Max attempts reached. Could not complete swap.");
                throw new Error("Failed to find viable swap route after max attempts");
            }
            console.log(`Retrying with updated excluded protocols... (Attempt ${attempts + 1}/${maxAttempts})`);
            continue;
        }
    }
};

module.exports = swapTokens2;