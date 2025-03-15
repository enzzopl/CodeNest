const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Serwowanie plików statycznych
app.use(express.static(__dirname + '/public'));


const baseAIFeedingInfo = [
  "Masz pamiętać o WSZYSTKICH kluczowych informacjach, o których mówi ci twój rozmówca. Masz zapisywać te informacje do swojej pamięci oraz pamiętać o nich w kontekście całej rozmowy.",
  "Zwracaj się do swojego rozmówcy bezpłciowo, neutralnie, nie używaj żadnych zaimków osobowych, takich jak 'pan', 'pani', 'ty', 'twój', 'moja', 'mój'.",
  "Jesteś profesjonalnym WebDeveloperem, który zna się na swojej pracy i umie napisać każdy kod. Pamiętaj, żeby nie udawać, że znasz odpowiedź na każde pytanie, ale zawsze staraj się pomóc swojemu rozmówcy.",
  "Pamiętaj twój rozmówca jest początkującym programistą który pobrał tą aplikację do nauki html, css i javascript",
  "Nie pytaj o dużą ilość szczegółów",
  "Zanim napiszesz cały kod zapytaj czy, ty masz napisać go, czy chce, żebyś mu pomógł w napisaniu kodu",
  "Jeżeli twój rozmówca raz ci napisze że chce żebyś napisał kod to już go nie pytaj czy chce żebyś mu pomógł w napisaniu kodu, tylko napisz mu kod",
  "Jak piszesz kod oddziel go na sekcje czyli pisz go w osobnych liniach np. html: kod html, css: kod css, js: kod js, aby twój rozmówca mógł łatwiej zrozumieć, co chcesz mu przekazać.",
  "Jeśli twój rozmówca sprawi, że nie będziesz mógł kontynuować z nim danej konwersacji, spróbuj zapomnieć o tym, co spowodowało taką sytuację i możesz ponownie zapytać, co trapi twojego rozmówcę, aby nie kończyć konwersacji i nie pozostawiać go samego."
];

const generateBaseInfo = () => {
  let baseInfo = "";

  for(let i = 0; i < baseAIFeedingInfo.length; i++) {
    baseInfo += baseAIFeedingInfo[i] + " ";
  }

  return baseInfo + "Twój rozmówca powiedział: ";
}

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("sendMessage", async (data) => {
    console.log("Received message:", data);
    try {
      socket.emit("botStartedTyping");

      const messages = [];

      if (data.context) {
        const contextMessages = data.context.split("\n");
        for (const msg of contextMessages) {
          if (!msg.trim()) continue;

          const parts = msg.split(": ");
          if (parts.length < 2) continue;

          const role = parts[0].trim().toLowerCase();
          const content = parts.slice(1).join(": ").trim();

          if (!content) continue;

          const correctRole = role === "user" ? "user" : "assistant";

          messages.push({
            role: correctRole,
            content: correctRole === "user" ? generateBaseInfo() + content : content,
          });
        }
      }

      messages.push({
        role: "user",
        content: generateBaseInfo() + data.message,
      });

      console.log("Sending messages to Mistral:", JSON.stringify(messages));

      console.log("Mistral API key:", process.env.MISTRAL_API_KEY);

      const response = await fetch(
        "https://api.mistral.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer SiSxISHSx04zxjZlBqkNTxhwM0H3fnFu`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistral-large-latest",
            messages: messages,
          }),
        }
      );

      const responseData = await response.json();
      console.log("Mistral response:", responseData);

      if (!response.ok) {
        throw new Error(responseData.message || "API error");
      }

      if (!responseData.choices || !responseData.choices[0]) {
        throw new Error("Invalid response format");
      }

      socket.emit("botStoppedTyping");

      const botResponse = responseData.choices[0].message.content;
      socket.emit("receiveMessage", {
        text: botResponse,
        isBot: true,
      });
    } catch (error) {
      console.error("Error details:", error);
      socket.emit("botStoppedTyping");

      let errorMessage = "Something went wrong";
      if (error.message === "Unauthorized") {
        errorMessage = "Invalid API key - please check your Mistral API key";
      } else if (error.message === "Rate limit exceeded") {
        errorMessage = "Too many requests - please try again later";
      }

      socket.emit("error", errorMessage);
      socket.emit("receiveMessage", {
        text: `Error: ${errorMessage}`,
        isBot: true,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 3001;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});