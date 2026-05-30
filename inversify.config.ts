import { Container } from "inversify";
import { LeadController } from "./src/controllers/lead.controller";
import { LeadService } from "./src/services/lead.service";

const container = new Container();
container.bind<LeadController>(LeadController).toSelf();
container.bind<LeadService>(LeadService).toSelf();

export default container;