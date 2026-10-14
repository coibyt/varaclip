// Terms of Use and Privacy Policy for VaraClip. Written in Vietnamese and English;
// other languages show the English text. `**bold**` marks the company details.
export interface LegalSection { title: string; paragraphs: string[] }
export interface LegalContent { title: string; updated: string; sections: LegalSection[]; businessIdLabel: string; addressLabel: string }

export const ENTITY = { name: "Moja Investors Oy", businessId: "3555331-8", address: "Hakaniemen torikatu 2 L 48, 00530 Helsinki, Finland", email: "info@varaaai.com" };

export const TERMS: Record<"vi" | "en", LegalContent> = {
  vi: {
    title: "Điều khoản sử dụng",
    updated: "Cập nhật lần cuối: 15/10/2026",
    businessIdLabel: "Mã số doanh nghiệp",
    addressLabel: "Địa chỉ",
    sections: [
      {
        title: "1. Giới thiệu chung",
        paragraphs: [
          "Vui lòng đọc kỹ Điều khoản sử dụng này (“Điều khoản”). Bằng việc đăng ký tài khoản hoặc sử dụng website và ứng dụng VaraClip.com (“VaraClip”), bạn xác nhận đã đọc, hiểu và đồng ý bị ràng buộc bởi Điều khoản này.",
          `VaraClip do **${ENTITY.name}** (“chúng tôi”) phát triển và sở hữu, mã số doanh nghiệp **${ENTITY.businessId}**, địa chỉ **${ENTITY.address}**, email liên hệ **${ENTITY.email}**.`,
          "Nếu bạn chưa đủ 18 tuổi, bạn cần có sự đồng ý của người giám hộ hợp pháp. Nếu bạn không đồng ý với Điều khoản, vui lòng không sử dụng VaraClip.",
        ],
      },
      {
        title: "2. VaraClip là gì",
        paragraphs: [
          "VaraClip là nền tảng video ngắn dành cho ngành làm đẹp: chủ salon, tiệm nail, spa đăng video; khách xem, thích, bình luận, theo dõi, nhắn tin, xem livestream và đặt lịch với salon.",
          "Các salon là đơn vị kinh doanh độc lập. Việc đặt lịch, thanh toán và chất lượng dịch vụ là giao dịch giữa bạn và salon; VaraClip không phải là bên cung cấp dịch vụ làm đẹp và không chịu trách nhiệm về dịch vụ đó.",
          "Chúng tôi có quyền thay đổi, bổ sung hoặc ngừng bất kỳ tính năng nào của VaraClip vào bất kỳ thời điểm nào.",
        ],
      },
      {
        title: "3. Tài khoản",
        paragraphs: [
          "Bạn cần cung cấp thông tin chính xác khi đăng ký và tự bảo mật mật khẩu của mình. Bạn chịu trách nhiệm về mọi hoạt động diễn ra dưới tài khoản của bạn.",
          "Mỗi người nên có một tài khoản. Chúng tôi có thể tạm khóa hoặc xóa tài khoản vi phạm Điều khoản hoặc pháp luật.",
        ],
      },
      {
        title: "4. Nội dung do người dùng đăng",
        paragraphs: [
          "Bạn giữ quyền sở hữu video, hình ảnh, bình luận và tin nhắn bạn đăng. Bằng việc đăng, bạn cấp cho VaraClip quyền không độc quyền, miễn phí, trên toàn thế giới để lưu trữ, hiển thị, phát, chia sẻ, nhúng (embed) và tạo bản tải xuống có logo VaraClip của nội dung đó nhằm vận hành dịch vụ.",
          "Bạn cam kết có đầy đủ quyền đối với nội dung bạn đăng, bao gồm hình ảnh và sự đồng ý của người xuất hiện trong video (ví dụ khách hàng của salon), và nhạc hoặc hình ảnh bên thứ ba.",
          "Chủ salon chịu trách nhiệm xin phép khách hàng trước khi đăng video có khuôn mặt hoặc thông tin nhận dạng của họ.",
        ],
      },
      {
        title: "5. Nội dung bị cấm",
        paragraphs: [
          "Bạn không được đăng hoặc phát nội dung: khiêu dâm hoặc phản cảm; bạo lực, thù ghét, quấy rối, phân biệt đối xử; vi phạm bản quyền hoặc quyền riêng tư của người khác; lừa đảo, giả mạo; kêu gọi chuyển tiền hoặc cung cấp thông tin tài khoản; quảng bá hàng hóa hoặc dịch vụ trái pháp luật; chứa mã độc hoặc spam.",
          "Livestream và khung chat phải tuân thủ các quy tắc trên. Chúng tôi và chủ phòng live có quyền xóa tin nhắn, chặn người dùng và dừng buổi phát.",
          "Chúng tôi có quyền gỡ nội dung và khóa tài khoản vi phạm mà không cần báo trước.",
        ],
      },
      {
        title: "6. Livestream và nội dung từ nền tảng khác",
        paragraphs: [
          "Chủ salon có thể phát trực tiếp bằng camera của thiết bị, hoặc dán liên kết livestream từ YouTube, Facebook, TikTok. Phần video đó chịu điều khoản của nền tảng tương ứng.",
          "Livestream bằng camera dùng kết nối trực tiếp giữa các thiết bị, chất lượng phụ thuộc vào mạng và thiết bị; chúng tôi không đảm bảo luôn kết nối được.",
          "Bạn không được ghi hình, sao chép hoặc phát lại livestream của người khác khi chưa được phép.",
        ],
      },
      {
        title: "7. Tin nhắn và liên lạc tiếp thị",
        paragraphs: [
          "Khi đăng ký, bạn có thể chọn nhận tin nhắn và thông báo tiếp thị qua email và/hoặc tin nhắn văn bản (SMS). Các lựa chọn này được chọn sẵn và bạn có thể bỏ chọn ngay khi đăng ký hoặc rút lại sự đồng ý bất cứ lúc nào bằng cách liên hệ với chúng tôi hoặc dùng liên kết hủy đăng ký trong tin nhắn.",
          "Chúng tôi vẫn có thể gửi thông báo cần thiết liên quan đến tài khoản và dịch vụ (ví dụ đặt lại mật khẩu, thay đổi điều khoản) kể cả khi bạn không nhận tin tiếp thị.",
        ],
      },
      {
        title: "8. Sở hữu trí tuệ",
        paragraphs: [
          "Tên VaraClip, logo, giao diện và mã nguồn của dịch vụ thuộc sở hữu của chúng tôi hoặc bên cấp phép. Bạn không được sao chép, sửa đổi hoặc khai thác chúng ngoài phạm vi cho phép.",
          "Nếu bạn cho rằng nội dung trên VaraClip vi phạm quyền của bạn, vui lòng gửi thông báo kèm thông tin chi tiết đến " + ENTITY.email + ".",
        ],
      },
      {
        title: "9. Quyền riêng tư",
        paragraphs: [
          "Việc thu thập và sử dụng dữ liệu cá nhân được mô tả trong Chính sách quyền riêng tư của VaraClip, là một phần của Điều khoản này.",
        ],
      },
      {
        title: "10. Giới hạn trách nhiệm",
        paragraphs: [
          "VaraClip được cung cấp “nguyên trạng”. Chúng tôi không đảm bảo dịch vụ hoạt động liên tục, không lỗi hoặc luôn sẵn sàng.",
          "Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm về nội dung do người dùng đăng, về dịch vụ do salon cung cấp, hay về thiệt hại gián tiếp phát sinh từ việc sử dụng VaraClip. Điều này không loại trừ trách nhiệm mà pháp luật không cho phép loại trừ.",
        ],
      },
      {
        title: "11. Chấm dứt",
        paragraphs: [
          "Bạn có thể ngừng sử dụng VaraClip và yêu cầu xóa tài khoản bất cứ lúc nào bằng cách liên hệ với chúng tôi. Chúng tôi có thể ngừng cung cấp dịch vụ cho bạn nếu bạn vi phạm Điều khoản này.",
        ],
      },
      {
        title: "12. Luật áp dụng và thay đổi điều khoản",
        paragraphs: [
          "Điều khoản này chịu sự điều chỉnh của pháp luật Phần Lan. Tranh chấp trước hết được giải quyết bằng thương lượng thiện chí; nếu không đạt được thỏa thuận, có thể đưa ra Tòa án quận Helsinki (Helsingin käräjäoikeus). Quyền lợi bắt buộc của người tiêu dùng theo pháp luật nơi bạn cư trú không bị ảnh hưởng.",
          "Chúng tôi có thể cập nhật Điều khoản này. Khi có thay đổi quan trọng, chúng tôi sẽ thông báo trên VaraClip hoặc qua email. Việc tiếp tục sử dụng sau khi thay đổi có hiệu lực nghĩa là bạn chấp nhận Điều khoản mới.",
        ],
      },
    ],
  },
  en: {
    title: "Terms of Use",
    updated: "Last updated: 15 October 2026",
    businessIdLabel: "Business ID",
    addressLabel: "Address",
    sections: [
      {
        title: "1. Introduction",
        paragraphs: [
          "Please read these Terms of Use (“Terms”) carefully. By creating an account or using the VaraClip.com website and app (“VaraClip”), you confirm that you have read, understood and agree to be bound by these Terms.",
          `VaraClip is developed and owned by **${ENTITY.name}** (“we”, “us”), business ID **${ENTITY.businessId}**, registered at **${ENTITY.address}**, contact email **${ENTITY.email}**.`,
          "If you are under 18, you need the consent of a parent or legal guardian. If you do not agree with these Terms, please do not use VaraClip.",
        ],
      },
      {
        title: "2. What VaraClip is",
        paragraphs: [
          "VaraClip is a short-video platform for the beauty industry: salon, nail studio and spa owners post videos; viewers watch, like, comment, follow, message, watch live streams and book with salons.",
          "Salons are independent businesses. Bookings, payments and the quality of services are matters between you and the salon; VaraClip is not a provider of beauty services and is not responsible for them.",
          "We may change, add or discontinue any feature of VaraClip at any time.",
        ],
      },
      {
        title: "3. Accounts",
        paragraphs: [
          "You must provide accurate information when you register and keep your password secure. You are responsible for all activity under your account.",
          "Each person should have one account. We may suspend or delete accounts that violate these Terms or the law.",
        ],
      },
      {
        title: "4. User content",
        paragraphs: [
          "You keep ownership of the videos, images, comments and messages you post. By posting, you grant VaraClip a non-exclusive, free, worldwide licence to store, display, play, share, embed and offer downloads (with the VaraClip logo) of that content in order to run the service.",
          "You promise that you have all necessary rights to the content you post, including the consent of people who appear in your videos (for example a salon’s customers) and rights to any music or third-party material.",
          "Salon owners are responsible for obtaining their customers’ permission before posting videos showing their face or identifying information.",
        ],
      },
      {
        title: "5. Prohibited content",
        paragraphs: [
          "You must not post or stream content that: is pornographic or sexually explicit; is violent, hateful, harassing or discriminatory; infringes copyright or others’ privacy; is fraudulent or impersonates someone; asks for money transfers or account details; promotes illegal goods or services; or contains malware or spam.",
          "Live streams and chat must follow the same rules. We and the owner of a live room may delete messages, block users and end a broadcast.",
          "We may remove content and suspend accounts that violate these rules without prior notice.",
        ],
      },
      {
        title: "6. Live streams and content from other platforms",
        paragraphs: [
          "Salon owners can go live with their device’s camera, or paste a live-stream link from YouTube, Facebook or TikTok. That video is governed by the terms of the respective platform.",
          "Camera live streams use direct connections between devices; quality depends on the network and devices, and we do not guarantee that a connection can always be made.",
          "You must not record, copy or rebroadcast someone else’s live stream without permission.",
        ],
      },
      {
        title: "7. Messages and marketing communications",
        paragraphs: [
          "When you register you can choose to receive marketing messages and notifications by email and/or text message (SMS). These choices are pre-selected and you can untick them at sign-up or withdraw your consent at any time by contacting us or using the unsubscribe link in a message.",
          "We may still send service messages that are necessary for your account (for example password resets or changes to these Terms) even if you opt out of marketing.",
        ],
      },
      {
        title: "8. Intellectual property",
        paragraphs: [
          "The VaraClip name, logo, design and source code belong to us or our licensors. You may not copy, modify or exploit them beyond what is permitted.",
          "If you believe content on VaraClip infringes your rights, please send a notice with details to " + ENTITY.email + ".",
        ],
      },
      {
        title: "9. Privacy",
        paragraphs: [
          "How we collect and use personal data is described in the VaraClip Privacy Policy, which forms part of these Terms.",
        ],
      },
      {
        title: "10. Limitation of liability",
        paragraphs: [
          "VaraClip is provided “as is”. We do not guarantee that the service will be uninterrupted, error-free or always available.",
          "To the extent permitted by law, we are not liable for user content, for services provided by salons, or for indirect damages arising from the use of VaraClip. This does not exclude liability that cannot be excluded by law.",
        ],
      },
      {
        title: "11. Termination",
        paragraphs: [
          "You may stop using VaraClip and ask us to delete your account at any time by contacting us. We may stop providing the service to you if you violate these Terms.",
        ],
      },
      {
        title: "12. Governing law and changes",
        paragraphs: [
          "These Terms are governed by the laws of Finland. Disputes are first addressed through good-faith negotiation; if no agreement is reached, they may be brought before the Helsinki District Court (Helsingin käräjäoikeus). Mandatory consumer rights under the law of your country of residence are not affected.",
          "We may update these Terms. For important changes we will notify you on VaraClip or by email. Continuing to use VaraClip after a change takes effect means you accept the new Terms.",
        ],
      },
    ],
  },
};

export const PRIVACY: Record<"vi" | "en", LegalContent> = {
  vi: {
    title: "Chính sách quyền riêng tư",
    updated: "Cập nhật lần cuối: 15/10/2026",
    businessIdLabel: "Mã số doanh nghiệp",
    addressLabel: "Địa chỉ",
    sections: [
      {
        title: "1. Giới thiệu chung",
        paragraphs: [
          `Chính sách này mô tả cách **${ENTITY.name}** (“chúng tôi”), mã số doanh nghiệp **${ENTITY.businessId}**, địa chỉ **${ENTITY.address}**, thu thập, sử dụng và bảo vệ dữ liệu cá nhân khi bạn dùng website và ứng dụng VaraClip.com. Chúng tôi là bên kiểm soát dữ liệu. Liên hệ: **${ENTITY.email}**.`,
          "Chúng tôi xử lý dữ liệu theo Quy định chung về bảo vệ dữ liệu của Liên minh châu Âu (GDPR) và pháp luật Phần Lan.",
        ],
      },
      {
        title: "2. Dữ liệu chúng tôi thu thập",
        paragraphs: [
          "Dữ liệu tài khoản: họ tên hiển thị, tên người dùng (@handle), email, mật khẩu (được mã hóa, chúng tôi không đọc được), số điện thoại nếu bạn nhập, ảnh đại diện, thành phố và thông tin salon nếu bạn là chủ salon.",
          "Nội dung bạn tạo: video, ảnh bìa, mô tả, bình luận, tin nhắn riêng, tin nhắn trong livestream, lượt thích, lượt lưu, lượt theo dõi.",
          "Sở thích xem: các từ khóa bạn tìm kiếm gần đây (lưu trong trình duyệt) và chủ đề của video bạn thích, lưu hoặc bình luận, để sắp xếp trang chủ phù hợp hơn.",
          "Dữ liệu kỹ thuật: địa chỉ IP, loại thiết bị và trình duyệt, ngôn ngữ, quốc gia ước tính từ kết nối, thời gian truy cập, nhật ký lỗi. Nếu bạn cài ứng dụng, chúng tôi ghi nhận một mã thiết bị ngẫu nhiên và loại thiết bị để thống kê số lượt cài đặt.",
          "Đồng ý tiếp thị: lựa chọn nhận tin qua email và/hoặc SMS và thời điểm bạn chấp nhận Điều khoản.",
        ],
      },
      {
        title: "3. Mục đích và cơ sở pháp lý",
        paragraphs: [
          "Cung cấp dịch vụ (đăng nhập, đăng và xem video, chat, livestream, nhắn tin): thực hiện hợp đồng với bạn.",
          "Bảo mật, chống lạm dụng, khắc phục sự cố, thống kê và cải thiện dịch vụ: lợi ích chính đáng của chúng tôi.",
          "Gợi ý video theo sở thích: lợi ích chính đáng; bạn có thể xóa cookie để đặt lại.",
          "Gửi tin nhắn và thông báo tiếp thị qua email hoặc SMS: sự đồng ý của bạn, có thể rút lại bất cứ lúc nào.",
          "Tuân thủ nghĩa vụ pháp lý khi có yêu cầu hợp lệ từ cơ quan có thẩm quyền.",
        ],
      },
      {
        title: "4. Cookie và lưu trữ trong trình duyệt",
        paragraphs: [
          "Chúng tôi dùng cookie cần thiết để duy trì đăng nhập, ghi nhớ ngôn ngữ, nhớ các tài khoản bạn chuyển đổi trên cùng thiết bị và ghi nhớ từ khóa tìm kiếm gần đây. Chúng tôi cũng lưu một số lựa chọn nhỏ trong bộ nhớ trình duyệt (ví dụ đã đóng gợi ý cài ứng dụng).",
          "Chúng tôi không dùng cookie quảng cáo của bên thứ ba. Khi bạn xem video livestream nhúng từ YouTube, Facebook hoặc TikTok, các nền tảng đó có thể đặt cookie theo chính sách của họ.",
        ],
      },
      {
        title: "5. Chia sẻ dữ liệu",
        paragraphs: [
          "Chúng tôi không bán dữ liệu cá nhân. Dữ liệu chỉ được chia sẻ trong các trường hợp sau:",
          "Nhà cung cấp hạ tầng đóng vai trò bên xử lý dữ liệu: dịch vụ lưu trữ website và cơ sở dữ liệu (Hostinger), lưu trữ video (Cloudflare R2), gửi email, và các nền tảng bạn chủ động dùng cùng VaraClip (YouTube, Facebook, TikTok).",
          "Thông tin công khai bạn chọn đăng (hồ sơ, video, bình luận, tin nhắn trong livestream) hiển thị cho người dùng khác. Tin nhắn riêng chỉ hiển thị cho người nhận.",
          "Cơ quan nhà nước khi có yêu cầu hợp pháp.",
        ],
      },
      {
        title: "6. Chuyển dữ liệu ra ngoài EU/EEA",
        paragraphs: [
          "Một số nhà cung cấp có thể xử lý dữ liệu bên ngoài EU/EEA. Khi đó chúng tôi dựa trên các biện pháp bảo vệ phù hợp theo GDPR, chẳng hạn điều khoản hợp đồng tiêu chuẩn của Liên minh châu Âu.",
        ],
      },
      {
        title: "7. Thời gian lưu trữ",
        paragraphs: [
          "Chúng tôi giữ dữ liệu tài khoản và nội dung cho đến khi bạn xóa hoặc yêu cầu xóa tài khoản. Dữ liệu kỹ thuật và thống kê được giữ trong thời gian hợp lý cần cho mục đích bảo mật và vận hành. Dữ liệu cần giữ theo nghĩa vụ pháp lý sẽ được giữ đủ thời hạn đó.",
        ],
      },
      {
        title: "8. Quyền của bạn",
        paragraphs: [
          "Bạn có quyền truy cập, chỉnh sửa, xóa dữ liệu của mình, hạn chế hoặc phản đối việc xử lý, chuyển dữ liệu sang nơi khác và rút lại sự đồng ý bất cứ lúc nào (việc rút lại không ảnh hưởng đến xử lý trước đó). Bạn có thể sửa thông tin trong Cài đặt hoặc gửi yêu cầu đến " + ENTITY.email + ".",
          "Bạn có quyền khiếu nại với cơ quan bảo vệ dữ liệu: Tietosuojavaltuutetun toimisto (Văn phòng Thanh tra bảo vệ dữ liệu Phần Lan), tietosuoja.fi.",
        ],
      },
      {
        title: "9. Bảo mật và trẻ em",
        paragraphs: [
          "Chúng tôi dùng các biện pháp kỹ thuật và tổ chức hợp lý (kết nối HTTPS, mật khẩu mã hóa, kiểm soát truy cập) để bảo vệ dữ liệu, nhưng không hệ thống nào an toàn tuyệt đối.",
          "VaraClip không dành cho trẻ em dưới 13 tuổi và chúng tôi không cố ý thu thập dữ liệu của các em. Nếu bạn phát hiện trẻ em đã đăng ký, vui lòng liên hệ để chúng tôi xóa.",
        ],
      },
      {
        title: "10. Thay đổi chính sách",
        paragraphs: [
          "Chúng tôi có thể cập nhật Chính sách này. Khi có thay đổi quan trọng, chúng tôi sẽ thông báo trên VaraClip hoặc qua email. Ngày cập nhật gần nhất được ghi ở đầu trang.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: 15 October 2026",
    businessIdLabel: "Business ID",
    addressLabel: "Address",
    sections: [
      {
        title: "1. Introduction",
        paragraphs: [
          `This policy describes how **${ENTITY.name}** (“we”), business ID **${ENTITY.businessId}**, registered at **${ENTITY.address}**, collects, uses and protects personal data when you use the VaraClip.com website and app. We are the data controller. Contact: **${ENTITY.email}**.`,
          "We process data in accordance with the EU General Data Protection Regulation (GDPR) and Finnish law.",
        ],
      },
      {
        title: "2. Data we collect",
        paragraphs: [
          "Account data: display name, username (@handle), email, password (encrypted; we cannot read it), phone number if you enter one, profile photo, city, and salon details if you are a salon owner.",
          "Content you create: videos, covers, captions, comments, private messages, live-stream chat messages, likes, saves and follows.",
          "Viewing interests: words you recently searched for (kept in your browser) and the topics of videos you like, save or comment on, used to order your home feed.",
          "Technical data: IP address, device and browser type, language, approximate country derived from the connection, access times and error logs. If you install the app, we record a random device ID and the device type to count installs.",
          "Marketing consent: your choice to receive email and/or SMS marketing and the time you accepted the Terms.",
        ],
      },
      {
        title: "3. Purposes and legal bases",
        paragraphs: [
          "Providing the service (sign-in, posting and watching videos, chat, live streams, messaging): performance of our contract with you.",
          "Security, preventing abuse, fixing problems, statistics and improving the service: our legitimate interests.",
          "Suggesting videos based on your interests: our legitimate interests; you can clear your cookies to reset this.",
          "Sending marketing messages and notifications by email or SMS: your consent, which you can withdraw at any time.",
          "Complying with legal obligations when a valid request is made by an authority.",
        ],
      },
      {
        title: "4. Cookies and browser storage",
        paragraphs: [
          "We use necessary cookies to keep you signed in, remember your language, remember the accounts you switch between on the same device and remember your recent searches. We also keep a few small choices in browser storage (for example that you closed the install-app prompt).",
          "We do not use third-party advertising cookies. When you watch a live stream embedded from YouTube, Facebook or TikTok, those platforms may set cookies under their own policies.",
        ],
      },
      {
        title: "5. Sharing data",
        paragraphs: [
          "We do not sell personal data. Data is shared only as follows:",
          "Infrastructure providers acting as processors: website and database hosting (Hostinger), video storage (Cloudflare R2), email delivery, and the platforms you choose to use with VaraClip (YouTube, Facebook, TikTok).",
          "Public information you choose to post (profile, videos, comments, live-chat messages) is visible to other users. Private messages are visible only to the recipient.",
          "Public authorities when legally required.",
        ],
      },
      {
        title: "6. Transfers outside the EU/EEA",
        paragraphs: [
          "Some providers may process data outside the EU/EEA. In that case we rely on appropriate safeguards under the GDPR, such as the European Union’s standard contractual clauses.",
        ],
      },
      {
        title: "7. Retention",
        paragraphs: [
          "We keep account data and content until you delete it or ask us to delete your account. Technical and statistical data is kept for as long as reasonably needed for security and operations. Data we must keep by law is kept for the required period.",
        ],
      },
      {
        title: "8. Your rights",
        paragraphs: [
          "You have the right to access, correct and delete your data, to restrict or object to processing, to data portability and to withdraw consent at any time (withdrawal does not affect earlier processing). You can edit your details in Settings or send a request to " + ENTITY.email + ".",
          "You have the right to complain to a data protection authority: the Office of the Data Protection Ombudsman in Finland (Tietosuojavaltuutetun toimisto), tietosuoja.fi.",
        ],
      },
      {
        title: "9. Security and children",
        paragraphs: [
          "We use reasonable technical and organisational measures (HTTPS, encrypted passwords, access control) to protect data, but no system is completely secure.",
          "VaraClip is not intended for children under 13 and we do not knowingly collect their data. If you find that a child has registered, please contact us so we can delete the account.",
        ],
      },
      {
        title: "10. Changes",
        paragraphs: [
          "We may update this policy. For important changes we will notify you on VaraClip or by email. The date of the latest update is shown at the top of the page.",
        ],
      },
    ],
  },
};
