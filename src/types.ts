export interface AgendaItem {
  id: string;
  date: string;
  locationName: string;
  locationCity: string;
  infoLink: string;
  ticketPrice: string;
  displayFrom: string;
  displayUntil: string;
  isVisible: boolean;
  ticketLink: string;
  isSoldOut: boolean;
  comments?: string;
  address?: string;
}
