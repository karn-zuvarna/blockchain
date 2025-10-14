import Fasify from "fastify";
import cors from "@fastify/cors";

const app = Fasify({
    logger: true,
});
await app.register(cors, {
    origin: true
})
