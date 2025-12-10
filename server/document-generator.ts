import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  HeadingLevel,
  convertInchesToTwip,
} from "docx";
import { format, differenceInCalendarDays } from "date-fns";
import { ru } from "date-fns/locale";
import type { Lead, LeadTourist, Event } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

interface DocumentData {
  lead: Lead;
  tourists: LeadTourist[];
  event: Event | null;
  primaryTourist: LeadTourist | null;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return format(date, "dd.MM.yyyy", { locale: ru });
  } catch {
    return dateStr || "";
  }
}

function formatDateLong(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return format(date, "dd MMMM yyyy", { locale: ru });
  } catch {
    return dateStr || "";
  }
}

function getContractNumber(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function getContractYear(): string {
  return new Date().getFullYear().toString();
}

function getTouristFullName(tourist: LeadTourist): string {
  return [tourist.lastName, tourist.firstName, tourist.middleName]
    .filter(Boolean)
    .join(" ");
}

function getCurrencySymbol(currency: string | null): string {
  switch (currency) {
    case "RUB":
      return "₽";
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "CNY":
      return "¥";
    default:
      return "₽";
  }
}

function formatMoney(amount: string | number | null, currency: string | null): string {
  if (!amount) return "";
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "";
  const symbol = getCurrencySymbol(currency);
  return `${numAmount.toLocaleString("ru-RU")} ${symbol}`;
}

export async function generateContract(data: DocumentData): Promise<Buffer> {
  const contractNumber = getContractNumber();
  const contractYear = getContractYear();
  const contractDate = formatDateLong(new Date().toISOString());

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "ДОГОВОР",
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "бронирования услуги по организации отдыха № ",
                size: 24,
              }),
              new TextRun({
                text: contractNumber,
                bold: true,
                color: "000000",
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "г. Хабаровск", size: 22 }),
              new TextRun({ text: "\t\t\t\t\t\t\t\t\t\t" }),
              new TextRun({
                text: contractDate,
                color: "000000",
                size: 22,
              }),
              new TextRun({ text: " г.", size: 22 }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "ИП Хон Александр Еуньевич, действующий от имени Unique China, зарегистрированного по законодательству КНР, именуемое в дальнейшем «АГЕНТ», с одной стороны, и лицо, заказывающее УСЛУГИ, информация о котором содержится в приложениях, именуемое в дальнейшем «ЗАКАЗЧИК», с другой стороны, заключили настоящий договор о нижеследующем:",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "1. ОПРЕДЕЛЕНИЯ И ПОНЯТИЯ",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "КООРДИНАТОР ГРУППЫ",
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: " — лицо, оказывающее помощь индивидуальному участнику или группе участников во время путешествия/экскурсии в соответствии с настоящим Договором.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "УСЛУГИ",
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: " — услуга или комплекс услуг, оказываемые АГЕНТОМ и (или) иными исполнителями услуг самостоятельно, входящие в Договор.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "ПРОГРАММА",
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: " — это маршрут путешествия, содержащий существенные условия, а именно путь следования, включающий перечень всех географических пунктов и мест, последовательно посещаемых ЗАКАЗЧИКОМ во время ПРОГРАММЫ, перечень туристских услуг и их стоимость и иную необходимую ЗАКАЗЧИКУ для совершения путешествия информацию (далее — ПРОГРАММА). Перечень всех Программ размещен по адресу: https://chinaunique.ru/.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "УЧАСТНИК",
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: " — заказчик и/или лица, в отношении которых заключён Договор, использующие или намеревающиеся использовать УСЛУГИ, входящие в ПРОГРАММУ.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "ЗАЯВКА",
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: " — электронный документ, заполненный и отправленный Участником по форме, установленной АГЕНТОМ, или отправленный в форме личного сообщения в официальных группах и аккаунтах АГЕНТА или способах, указанных в них. Переписка СТОРОН относительно ПРОГРАММЫ является согласованием условий, отражающим все существенные для ЗАКАЗЧИКА условия.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "ТРАНСФЕР",
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: " — услуга по перевозке в месте временного пребывания. Перевозка до страны временного пребывания не является трансфером.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "2. ПРЕДМЕТ ДОГОВОРА",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "2.1. В соответствии с условиями настоящего Договора АГЕНТ обязуется по заявке ЗАКАЗЧИКА оказать помощь в бронировании услуг у непосредственных исполнителей или через агентов исполнителей.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "2.2. АГЕНТ выдаёт ЗАКАЗЧИКУ документы, подтверждающие право на забронированные услуги, в порядке и на условиях, предусмотренных настоящим Договором и/или договорными отношениями с исполнителями услуг или договором с агентом исполнителя.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "2.3. Наименование, потребительские свойства и иные условия услуг отражены на интернет-ресурсе АГЕНТА и/или Приложении.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "3. ПОРЯДОК ЗАКЛЮЧЕНИЯ ДОГОВОРА",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "3.1. Настоящий Договор заключается путём акцепта ЗАКАЗЧИКОМ ОФЕРТЫ на интернет ресурсе АГЕНТА. Акцептом настоящего Договора является оплата (в том числе частичная) ЗАКАЗЧИКОМ. Акцептуя Оферту, ЗАКАЗЧИК подтверждает своё ознакомление с условиями Договора, ПРОГРАММОЙ, а также иной существенной информацией, размещённой на интернет ресурсе АГЕНТА (в том числе с использованием интернет ссылок).",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "СТОРОНЫ обязуются вести переписку посредством электронной почты, мессенджеров, в соцсетях, согласованных СТОРОНАМИ. Для АГЕНТА надлежащим адресом электронной почты, соцсети, мессенджера ЗАКАЗЧИКА является адрес, с которого поступил запрос на заключение Договора, оформление/бронирование/подбор УСЛУГ и т.п. СТОРОНЫ установили считать адрес электронной почты, мессенджера, соцсети аналогом собственноручной подписи.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "3.2. Настоящий Договор вступает в силу с момента внесения денежных средств (в том числе частичной) в счёт оплаты цены Договора. Оплата Договора, в том числе и частичная, подтверждает ознакомление ЗАКАЗЧИКА с условиями Договора, Программой, а также иной существенной информацией, размещённой на интернет ресурсе АГЕНТА (в том числе с использованием интернет ссылок).",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "3.3. СТОРОНЫ определили, что надлежащим информированием СТОРОНАМИ друг друга о наличии каких-либо изменений в услугах будет являться в том числе уведомление посредством SMS сообщения или электронной почты, мессенджеров, в соцсетях, согласованных СТОРОНАМИ.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "4. ПОРЯДОК БРОНИРОВАНИЯ И РАСЧЕТЫ",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "4.2. Бронирование ПРОГРАММЫ осуществляется ЗАКАЗЧИКОМ на интернет-ресурсе АГЕНТА или иным способом, установленным АГЕНТОМ либо путём направления заявки или путём нажатия кнопки бронирования на интернет-ресурсе АГЕНТА.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "4.3. Стоимость и порядок оплаты.",
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "4.1. Стоимость услуг по настоящему договору указывается в ПРОГРАММЕ и уплачивается ЗАКАЗЧИКОМ в порядке, предусмотренном Договором или иным Соглашением, ПРОГРАММОЙ или иным приложением и т. п. Если иного не установлено требованием АГЕНТА, оплата стоимости Договора производится в следующем порядке:",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "10 % предоплаты оплачивается ЗАКАЗЧИКОМ непосредственно через АГЕНТА.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "Оставшаяся сумма оплачивается ЗАКАЗЧИКОМ в месте оказания УСЛУГ непосредственному исполнителю.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "4.2. Стоимость Договора, предусматривающего выезд за пределы Российской Федерации, устанавливается с привязкой к иностранной валюте, о чём ЗАКАЗЧИК информируется в письменном виде путём размещения данной информации на интернет-ресурсе или в приложении.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "4.3. Если оплата осуществляется частями, то ЗАКАЗЧИК оплачивает стоимость Договора на момент фактического внесения денежных средств с учётом изменения курса валюты. При этом при оплате ЗАКАЗЧИКОМ цены Договора до 15 часов (по московскому времени) учитывается курс валюты, установленный на условиях Договора, на день оплаты, после 15 часов — курс валюты следующего рабочего дня.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "4.4. В случае отказа ЗАКАЗЧИКА от забронированных услуг АГЕНТ удерживает фактически понесенные расходы, связанные с исполнением обязательства, устанавливаемые непосредственным исполнителем услуг и/или АГЕНТОМ.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "5. ПРАВА И ОБЯЗАННОСТИ СТОРОН",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "5.1. АГЕНТ имеет право:",
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "5.1.1. В одностороннем порядке расторгнуть договор, уведомив об этом ЗАКАЗЧИКА в устной форме (по телефону) в случае полной или частичной неоплаты либо несвоевременной оплатой ЗАКАЗЧИКОМ любой части заказанных услуг, непредставление либо несвоевременное предоставление необходимых для оформления либо оказания услуг документов.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "5.1.2. Отказаться от исполнения Договора при отсутствии вины АГЕНТА, возвратить ЗАКАЗЧИКУ денежные средства, внесенные в счет оплаты Договора.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "5.2. АГЕНТ обязан:",
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "5.2.1. Доводить до сведения ЗАКАЗЧИКА объективную информацию о бронируемых услугах и иную информацию, необходимую в рамках выполнения обязательств по настоящему Договору;",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "5.2.2. Правильно оформить необходимый пакет документов, выдаваемый ЗАКАЗЧИКУ, в том числе путёвку или иной документ в соответствии с Договором.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "5.2.3. Обеспечить сохранность полученных от ЗАКАЗЧИКА документов, удостоверяющих личность, принятых АГЕНТОМ для оформления документов.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "5.3. ЗАКАЗЧИК имеет право:",
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "5.3.1. Требовать от АГЕНТА предоставления полной, достоверной информации о бронируемой услуге и месте размещения.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "5.3.2. Оказания ему исполнителем услуги всех забронированных услуг надлежащего качества и безопасности.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "5.3.3. Обратиться непосредственно к исполнителю услуги или агенту исполнителя с письменными претензиями по поводу качества оказанных и/или оказываемых им услуг в течение 10 дней с момента наступления обстоятельств, послуживших поводом для предъявления претензий.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "5.4. ЗАКАЗЧИК обязан:",
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "Предоставить АГЕНТУ все данные и документы, необходимые для исполнения обязательства, указываемые АГЕНТОМ.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "5.4.1. Оплатить стоимость Договора.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "5.4.2. Уведомить всех лиц, указанных в заявке, обо всех условиях настоящего Договора, а также об информации, полученной от АГЕНТА.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "5.5. О наличии своих (а также иных лиц, отдыхающих совместно) претензиях и жалобах к исполнителю услуги немедленно уведомлять АГЕНТ в письменной форме, в том числе посредством SMS-сообщения, e-mail переписки и пр.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "6. ОТВЕТСТВЕННОСТЬ СТОРОН",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.1. За неисполнение либо ненадлежащее исполнение своих обязательств, указанных в Договоре, СТОРОНЫ несут ответственность в соответствии с действующим законодательством РФ и Договором, при этом ответственность за качество оказания услуг, указанных в ЗАЯВКЕ, несет исполнитель услуг, если иное не вытекает из закона или Договора с исполнителем услуг или агентом исполнителя.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.2. АГЕНТ несет ответственность за:",
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.2.1. Полноту и своевременность передачи ЗАКАЗЧИКУ информации, предоставленной исполнителем услуг или его агентом.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.2.2. Оформление всех необходимых документов при условии исполнения ЗАКАЗЧИКОМ обязанностей, предусмотренных п. 3.3. Договора.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.2.3. Своевременное перечисление денежных средств, переданных ЗАКАЗЧИКОМ в счет оплаты забронированных услуг.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.3. АГЕНТ не несет ответственности за:",
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.3.1. Причинение вреда жизни и здоровью ЗАКАЗЧИКА и/или совместно отдыхающим лицам, а также третьим лицам, произошедшие вследствие нарушения ЗАКАЗЧИКОМ правил личной и иной безопасности (в т. ч. противопожарной, противоэпидемиологической и т. п.), законов страны (места) временного пребывания, культурных и иных особенностей местности;",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.3.2. Несоответствие представленных в соответствии с настоящим Договором услуг ожиданиям ЗАКАЗЧИКА (иных совместно отдыхающих лиц), основанном на их личном убеждении, стороннем опыте, отзывах;",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.3.3. Действия ЗАКАЗЧИКА, повлекшие за собой причинение ущерба третьим лицам, а также невозможность воспользоваться заказанными услугами (по собственной инициативе или вине);",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.3.4. Отсутствие у совместно отдыхающих с ЗАКАЗЧИКОМ лиц информации Договора и информации о забронированных услугах.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.4. ЗАКАЗЧИК несет ответственность:",
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.4.1. За неполное и/или несвоевременное предоставление необходимых для исполнения обязательств документов и/или информации.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.4.2. За неполное и/или несвоевременное внесение денежных средств в счет оплаты забронированных услуг.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.4.3. За отказ от забронированных услуг на основании и в размере, определенном особенностями настоящего Договора и/или характером обязательства и установленных непосредственным исполнителем услуг и/или его агентом.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.4.4. Перед отдыхающими совместно с ним лицами в случае непредоставления или неполного предоставления полученной от АГЕНТА информации об условиях Договора и/или информации о забронированных услугах.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.4.5. За расходы, понесенные им при заказе и оплате услуг, не указанных в настоящем Договоре.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "6.5. Стороны несут ответственность за неисполнение (ненадлежащее исполнение) условий настоящего Договора, если они не выполнились вследствие действия обстоятельств непреодолимой силы (форс-мажор), наступление которых на момент заключения настоящего Договора не могли предвидеть и предотвратить разумными мерами.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "Сторона, ссылающаяся на форс-мажорные обстоятельства, обязана немедленно, но не позднее суток с момента возникновения таких обстоятельств, письменно уведомить другую сторону о форс-мажоре с приложением подтверждающих документов, за исключением общеизвестных фактов.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "Сторона, своевременно не уведомившая другую сторону о возникновении форс-мажорных обстоятельств, не вправе ссылаться в последующем на такие обстоятельства как на основание отсутствия вины и несет полную материальную ответственность за нарушение условия обязательства.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "7. УСЛОВИЯ ИЗМЕНЕНИЯ ИЛИ РАСТОРЖЕНИЯ ДОГОВОРА",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "7.1. Каждая из сторон вправе потребовать изменения или расторжения договора в связи с существенными изменениями обстоятельств.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "7.2. При расторжении договора по инициативе ЗАКАЗЧИКА ЗАКАЗЧИК сообщает об этом в письменном виде и возмещает все фактические расходы в соответствии с условиями договора.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "7.3. Стороны пришли к соглашению принимать все зависящие от них меры по решению возможных разногласий и споров, которые могут возникнуть в процессе реализации настоящего договора, путем переговоров во внесудебном порядке. При невозможности внесудебного урегулирования спора, он рассматривается в судебном порядке, предусмотренном действующим законодательством РФ.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "7.4. Порядок разрешения спора до суда:",
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: "Рекламации и претензии ЗАКАЗЧИКА по вопросам неисполнения взятых на себя АГЕНТОМ обязательств принимаются в течение 10 дней с момента возникновения обстоятельств, послуживших поводом для предъявления претензий. Претензии составляются в письменной форме, с обязательным указанием сути вопроса, данных о заявителе, его адреса и контактного телефона, предъявляемых требований, а также с приложением документов, доказывающих нанесение ЗАКАЗЧИКУ материального ущерба. Претензия подлежит рассмотрению в течение 10 дней после получения АГЕНТОМ претензии. В случае предъявления претензий к исполнителю услуг по вопросам качества предоставленных или предоставляемых услуг сохраняется порядок, указанный выше.",
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "РЕКВИЗИТЫ",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({
                text: "АГЕНТ:",
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "ИП Хон Александр Еуньевич,",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Инн 272426796441",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Адрес: Московская область, Красногорский район, ул.Липовой рощи 1 к 3 /450",
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Юридический адрес: Город Хабаровск, ул. Антенная 3",
                size: 22,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}

export async function generateBookingSheet(
  data: DocumentData
): Promise<Buffer> {
  const contractNumber = getContractNumber();
  const contractDate = formatDateLong(new Date().toISOString());

  const primaryTourist = data.primaryTourist || data.tourists[0];

  const eventStartDate = data.event?.startDate
    ? formatDate(data.event.startDate)
    : "";
  const eventEndDate = data.event?.endDate
    ? formatDate(data.event.endDate)
    : "";
  const dateRange =
    eventStartDate && eventEndDate
      ? `${eventStartDate}- ${eventEndDate}`
      : "";

  const touristRows: Paragraph[] = data.tourists.map((tourist, index) => {
    const fullName =
      tourist.foreignPassportName || getTouristFullName(tourist);
    const dob = tourist.dateOfBirth ? formatDate(tourist.dateOfBirth) : "";
    const passportNum = tourist.foreignPassportNumber || "";

    return new Paragraph({
      children: [
        new TextRun({
          text: `${index + 1}. ${fullName}, Дата рождения ${dob}, № з/паспорта ${passportNum}`,
          size: 22,
        }),
      ],
    });
  });

  const stampImagePath = path.join(
    process.cwd(),
    "attached_assets",
    "image_1765389051945.png"
  );
  let stampImageData: Buffer | null = null;

  try {
    if (fs.existsSync(stampImagePath)) {
      stampImageData = fs.readFileSync(stampImagePath);
    }
  } catch (error) {
    console.log("Stamp image not found, proceeding without it");
  }

  const children: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "К ДОГОВОРУ ",
          size: 22,
        }),
        new TextRun({
          text: contractNumber,
          color: "000000",
          size: 22,
        }),
        new TextRun({
          text: " от ",
          size: 22,
        }),
        new TextRun({
          text: contractDate,
          color: "000000",
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "ЛИСТ БРОНИРОВАНИЯ (ЗАЯВКА НА БРОНИРОВАНИЕ УСЛУГ)",
          bold: true,
          size: 24,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({
          text: "1. Заказчик: ",
          bold: true,
          size: 22,
        }),
        new TextRun({
          text: getTouristFullName(primaryTourist),
          size: 22,
        }),
        new TextRun({
          text: ", паспорт: №",
          size: 22,
        }),
        new TextRun({
          text: primaryTourist.foreignPassportNumber || "",
          size: 22,
        }),
        new TextRun({
          text: " , годен до ",
          size: 22,
        }),
        new TextRun({
          text: primaryTourist.foreignPassportValidUntil
            ? formatDate(primaryTourist.foreignPassportValidUntil)
            : "",
          size: 22,
        }),
        new TextRun({
          text: " г,",
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "дата рождения ",
          size: 22,
        }),
        new TextRun({
          text: primaryTourist.dateOfBirth
            ? formatDate(primaryTourist.dateOfBirth)
            : "",
          size: 22,
        }),
        new TextRun({
          text: ". Гражданство Россия",
          size: 22,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({
          text: "2. Даты поездки: ",
          bold: true,
          size: 22,
        }),
        new TextRun({
          text: dateRange,
          size: 22,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({
          text: "3. Лица, совершающие поездку: ",
          bold: true,
          size: 22,
        }),
        new TextRun({
          text: "Фамилия, Имя (как в з/пасп.)",
          size: 22,
        }),
      ],
    }),
    ...touristRows,
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({
          text: "4. Информация о размещении по маршруту:",
          bold: true,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Страна - Китай",
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "• Отели/кат. : 5*",
          size: 22,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Кол-во ночей", bold: true, size: 20 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Тип номера", bold: true, size: 20 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Питание", bold: true, size: 20 }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: data.event?.startDate && data.event?.endDate
                        ? String(
                            Math.max(
                              0,
                              differenceInCalendarDays(
                                new Date(data.event.endDate),
                                new Date(data.event.startDate)
                              )
                            )
                          )
                        : "",
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: data.lead.roomType || "",
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: data.lead.meals || "",
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({
          text: "5.Трансферы: ",
          bold: true,
          size: 22,
        }),
        new TextRun({
          text: "Входят все индивидуальные трансферы по маршруту с аэропортов, вокзалов.",
          size: 22,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({
          text: "6. Маршрут тура: ",
          bold: true,
          size: 22,
        }),
        new TextRun({
          text: data.event?.name || "",
          size: 22,
        }),
        new TextRun({
          text: data.event?.cities
            ? `: ${data.event.cities.join(", ")}`
            : "",
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Полная программа тура на сайте: https://chinaunique.ru/",
          size: 22,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({
          text: "_______________________________________________________________",
          size: 22,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Общая стоимость: ",
          bold: true,
          size: 22,
        }),
        new TextRun({
          text: formatMoney(data.lead.tourCost, data.lead.tourCostCurrency),
          size: 22,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Предоплата: ",
          bold: true,
          size: 22,
        }),
        new TextRun({
          text: formatMoney(
            data.lead.advancePayment,
            data.lead.advancePaymentCurrency
          ),
          size: 22,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Остаток оплатить/ дата: ",
          bold: true,
          size: 22,
        }),
        new TextRun({
          text: formatMoney(
            data.lead.remainingPayment,
            data.lead.remainingPaymentCurrency
          ),
          size: 22,
        }),
        new TextRun({
          text: eventStartDate ? ` ${eventStartDate}` : "",
          size: 22,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Предоплата производится в рублях по курсу покупки на день внесения оплаты. Остаток производится наличными в валюте по прилету.",
          size: 20,
        }),
      ],
    }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
  ];

  if (stampImageData) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: stampImageData,
            transformation: {
              width: 120,
              height: 120,
            },
            type: "png",
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}
