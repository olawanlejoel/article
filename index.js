const contractSource = `
  payable contract ArticleAmount =
    record article = 
      { publisherAddress : address,
        title            : string,
        name             : string,
        article          : string,
        caption          : string,
        appreciatedAmount: int }
    record state = { 
      articles : map(int, article),
       totalArticles : int }
    
    entrypoint init() = 
      { articles = {},
       totalArticles = 0 }
    
    entrypoint fetchArticle(index : int) : article =
      switch(Map.lookup(index, state.articles))
        None   => abort("No Article was registered with this index number.")
        Some(x)=> x
      
    stateful entrypoint publishArticle(title' : string, name' : string, article' : string, caption' : string) =
      let article = { publisherAddress = Call.caller, title = title', name = name', article = article', caption = caption', appreciatedAmount = 0}
      let index = fetchtotalArticles() + 1
      put(state { articles[index] = article, totalArticles = index})
      
    entrypoint fetchtotalArticles() : int =
      state.totalArticles
      
    payable stateful entrypoint appreciateArticle(index : int) =
      let article = fetchArticle(index)
      Chain.spend(article.publisherAddress, Call.value)
      let updatedappreciatedAmount = article.appreciatedAmount + Call.value
      let updatedArticles = state.articles{ [index].appreciatedAmount = updatedappreciatedAmount }
      put(state{ articles = updatedArticles })
`;
const contractAddress ='ct_2gp7KTyUMLrfH7a2tfYGaT24pY33BoB2GHk1QJpRDF6dAbZexS';
var client = null;
var contractInstance = null;
var articleDetails = [];
var totalArticles = 0;

function renderArticles() {
  articleDetails = articleDetails.sort((x, y) => y.Amount - x.Amount);
  let template = $('#template').html();
  Mustache.parse(template);
  let rendered = Mustache.render(template, {articleDetails});
  $('#articlesBody').html(rendered);
}

async function callStatic(func, args) {
  //Create a new contract instance that we can interact with
  const contract = await client.getContractInstance(contractSource, {
    contractAddress
  });

  const calledGet = await contract
    .call(func, args, {
      callStatic: true
    })
    .catch(e => console.error(e));

  const decodedGet = await calledGet.decode().catch(e => console.error(e));
  console.log("number of posts : ", decodedGet);
  return decodedGet;
}

async function contractCall(func, args, value) {
  const contract = await client.getContractInstance(contractSource, {
    contractAddress
  });
  //Make a call to write smart contract func, with aeon value input
  const calledSet = await contract
    .call(func, args, {
      amount: value
    })
    .catch(e => console.error(e));

  return calledSet;
}

window.addEventListener('load', async () => {
  $("#loader").show();

  client = await Ae.Aepp();

  // contractInstance = await client.getContractInstance(contractSource, {contractAddress});

  // totalArticles = (await contractInstance.methods.fetchtotalArticles()).decodedResult;
  totalArticles =  await callStatic('fetchtotalArticles', [])
  console.log(totalArticles)

  for (let i = 1; i <= totalArticles; i++) {

    // const article = (await contractInstance.methods.fetchArticle(i)).decodedResult;
    const article = await callStatic('fetchArticle', [])
    console.log(article)

    articleDetails.push({
      articleTitle     : article.title,
      author           : article.name,
      article          : article.article,
      caption          : article.caption,
      index            : i,
      amount: article.appreciatedAmount,
    })
  }

  renderArticles();

  $("#loader").hide();
});

jQuery("#articlesBody").on("click", ".appreciateBtn", async function(event){
  $("#loader").show();
  let value = $(this).siblings('input').val(),
      index = event.target.id;

  await contractInstance.methods.appreciateArticle(index, { amount: value }).catch(console.error);
  await contractCall('appreciateArticle', [index], value )

  const foundIndex = articleDetails.findIndex(article => article.index == event.target.id);
  articleDetails[foundIndex].Amount += parseInt(value, 10);

  
  renderArticles();
  $("#loader").hide();
});

$('#publishBtn').click(async function(){
  console.log("clicked submit")
  $("#loader").show();
  const title = ($('#title').val()),
    	  name = ($('#name').val()),
    	  article = ($('#info').val()),
        caption = ($('#caption').val());

  // await contractInstance.methods.publishArticle(title, name, article, caption);
  await contractCall('publishArticle', [title, name, article, caption], 0)

  articleDetails.push({
    articleTitle: title,
    author: name,
    article: article,
    caption: caption,
    index: articleDetails.length+1,
    amount: 0,
  });
  renderArticles();
  $("#loader").hide();
});
